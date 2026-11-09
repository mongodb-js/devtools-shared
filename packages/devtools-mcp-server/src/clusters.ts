import path from 'path';
import { promises as fs } from 'fs';
import {
  instances as runnerInstances,
  start as runnerStart,
  stop as runnerStop,
  type MongoClusterOptions,
  type SLSMultiCellEnvironment,
} from '@mongodb-js/mongodb-runner';
import { toRunnerOptions } from './options';
import {
  DEFAULT_RUNNER_DIR,
  flattenServers,
  resolveRunnerDir,
  type StoredCluster,
  type Topology,
} from './registry';
import {
  inspectCluster,
  type ClusterInspector,
  type ClusterVariant,
} from './connection';
import {
  DEFAULT_LOG_TAIL_LINES,
  readClusterLogs,
  type ServerLog,
} from './logs';
import type { StartClusterInput, StopClusterInput } from './schema';

export { DEFAULT_RUNNER_DIR, resolveRunnerDir };
export type { StoredCluster, Topology };

export type ClusterSummary = {
  id: string;
  connectionString: string;
  topology: Topology;
  replSetName?: string;
  /** ISO timestamp of when the cluster's first server was started. */
  startedAt?: string;
};

export type StartClusterResult = ClusterSummary & {
  logDir?: string;
  sls?: {
    ports: SLSMultiCellEnvironment['ports'];
    services: SLSMultiCellEnvironment['services'];
  };
};

export type ClusterServer = {
  host: string;
  port?: number;
  type: 'mongod' | 'mongos';
};

export type ClusterDetails = ClusterSummary & {
  running: boolean;
  servers: ClusterServer[];
  logDir?: string;
  version?: string;
  variant?: ClusterVariant;
  /** Why the cluster is not reachable, when running is false. */
  error?: string;
};

export type StopClustersResult = {
  stopped: string[];
};

export type PruneClustersResult = {
  removed: string[];
};

export type ClusterLogsInput = {
  id: string;
  tailLines?: number;
};

export interface Clusters {
  start(input: StartClusterInput): Promise<StartClusterResult>;
  list(): Promise<ClusterSummary[]>;
  stop(input: StopClusterInput): Promise<StopClustersResult>;
  get(input: { id: string }): Promise<ClusterDetails>;
  prune(): Promise<PruneClustersResult>;
  logs(input: ClusterLogsInput): Promise<ServerLog[]>;
}

/** The subset of `mongodb-runner` used here, narrow enough to be faked in tests. */
export interface RunnerApi {
  start(
    options: MongoClusterOptions & { id?: string; runnerDir: string },
    args?: string[],
  ): Promise<{
    cluster: {
      connectionString: string;
      serialize(): { topology: Topology; replSetName?: string };
    };
    id: string;
  }>;
  instances(options: { runnerDir: string }): AsyncIterable<StoredCluster>;
  stop(options: {
    runnerDir: string;
    id?: string;
    all?: boolean;
  }): Promise<void>;
  /** Removes a stored cluster's metadata file. */
  remove(filepath: string): Promise<void>;
}

const defaultRunnerApi: RunnerApi = {
  start: runnerStart,
  instances: runnerInstances,
  stop: runnerStop,
  remove: (filepath) => fs.rm(filepath, { force: true }),
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function summarize(stored: StoredCluster): ClusterSummary {
  const { topology, replSetName, servers } = stored.serialized;
  const startedAt = servers[0]?.startTime;
  return {
    id: stored.id,
    connectionString: stored.connectionString,
    topology,
    ...(replSetName ? { replSetName } : {}),
    ...(startedAt ? { startedAt } : {}),
  };
}

export function createClusters({
  runnerDir = resolveRunnerDir(),
  runner = defaultRunnerApi,
  inspect = inspectCluster,
}: {
  runnerDir?: string;
  runner?: RunnerApi;
  inspect?: ClusterInspector;
} = {}): Clusters {
  async function findInRegistry(id: string): Promise<StoredCluster> {
    for await (const instance of runner.instances({ runnerDir })) {
      if (instance.id === id) {
        return instance;
      }
    }
    throw new Error(
      `No running cluster with id "${id}". Use mongodb_list_clusters to see the available ids.`,
    );
  }

  async function start(input: StartClusterInput): Promise<StartClusterResult> {
    const { options, args, sls } = await toRunnerOptions(input, {
      defaultLogDir: path.join(runnerDir, 'logs'),
    });
    const { cluster, id } = await runner.start(
      { ...options, id: input.id, runnerDir },
      args,
    );
    const { topology, replSetName } = cluster.serialize();

    return {
      id,
      connectionString: cluster.connectionString,
      topology,
      ...(replSetName ? { replSetName } : {}),
      ...(options.logDir ? { logDir: options.logDir } : {}),
      ...(sls ? { sls: { ports: sls.ports, services: sls.services } } : {}),
    };
  }

  async function list(): Promise<ClusterSummary[]> {
    const clusters: ClusterSummary[] = [];
    for await (const instance of runner.instances({ runnerDir })) {
      clusters.push(summarize(instance));
    }
    return clusters.sort(
      (a, b) =>
        (a.startedAt ?? '').localeCompare(b.startedAt ?? '') ||
        a.id.localeCompare(b.id),
    );
  }

  async function stop(input: StopClusterInput): Promise<StopClustersResult> {
    if (input.all && input.id !== undefined) {
      throw new Error('"id" and "all" cannot be combined.');
    }

    const ids = (await list()).map((cluster) => cluster.id);

    if (input.all) {
      if (ids.length === 0) {
        return { stopped: [] };
      }
      await runner.stop({ runnerDir, all: true });
      return { stopped: ids };
    }

    if (input.id === undefined) {
      throw new Error(
        'Either "id" or "all: true" is required to stop clusters.',
      );
    }
    if (!ids.includes(input.id)) {
      throw new Error(
        `No running cluster with id "${input.id}". Use mongodb_list_clusters to see the available ids.`,
      );
    }

    await runner.stop({ runnerDir, id: input.id });
    return { stopped: [input.id] };
  }

  async function get({ id }: { id: string }): Promise<ClusterDetails> {
    const stored = await findInRegistry(id);
    const servers: ClusterServer[] = flattenServers(stored.serialized).map(
      (server) => ({
        host: server.host ?? '127.0.0.1',
        port: server.port,
        type: server.isMongos ? 'mongos' : 'mongod',
      }),
    );
    const logDir = stored.serialized.options?.logDir;
    const base = {
      ...summarize(stored),
      servers,
      ...(logDir ? { logDir } : {}),
    };

    try {
      const inspection = await inspect(stored.serialized);
      return { ...base, running: true, ...inspection };
    } catch (error) {
      return { ...base, running: false, error: errorMessage(error) };
    }
  }

  /** Drops metadata for clusters that are not reachable, like `mongodb-runner prune`. */
  async function prune(): Promise<PruneClustersResult> {
    const removed: string[] = [];
    for await (const instance of runner.instances({ runnerDir })) {
      const reachable = await inspect(instance.serialized).then(
        () => true,
        () => false,
      );
      if (!reachable) {
        await runner.remove(instance.filepath);
        removed.push(instance.id);
      }
    }
    return { removed };
  }

  async function logs({
    id,
    tailLines = DEFAULT_LOG_TAIL_LINES,
  }: ClusterLogsInput): Promise<ServerLog[]> {
    const stored = await findInRegistry(id);
    return readClusterLogs(stored.serialized, { tailLines });
  }

  return { start, list, stop, get, prune, logs };
}
