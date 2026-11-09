import os from 'os';
import path from 'path';
import {
  instances,
  type MongoClusterOptions,
  type MongoClusterSerializedProperties,
  type MongoServerSerializedProperties,
} from '@mongodb-js/mongodb-runner';

export const DEFAULT_RUNNER_DIR = path.join(
  os.homedir(),
  '.mongodb',
  'runner2',
);

/**
 * Cluster metadata lives where the `mongodb-runner` CLI keeps it by default, so
 * clusters started by either one can be inspected and stopped by the other.
 */
export function resolveRunnerDir(): string {
  const fromEnv = process.env.MONGODB_RUNNER_RUNNER_DIR;
  return fromEnv ? path.resolve(fromEnv) : DEFAULT_RUNNER_DIR;
}

export type Topology = MongoClusterOptions['topology'];

export type StoredCluster = {
  id: string;
  connectionString: string;
  filepath: string;
  serialized: MongoClusterSerializedProperties;
};

export async function findStoredCluster(
  runnerDir: string,
  clusterId: string,
): Promise<StoredCluster> {
  for await (const instance of instances({ runnerDir })) {
    if (instance.id === clusterId) {
      return instance;
    }
  }
  throw new Error(
    `No running cluster with id "${clusterId}". Use mongodb_list_clusters to see the available ids.`,
  );
}

/** Every server of a cluster, including the servers of each shard replica set. */
export function flattenServers(
  cluster: MongoClusterSerializedProperties,
): MongoServerSerializedProperties[] {
  return [
    ...cluster.servers,
    ...cluster.shards.flatMap((shard) => flattenServers(shard)),
  ];
}
