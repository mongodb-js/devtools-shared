import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { execFile as execFileCb } from 'child_process';
import { promisify } from 'util';
import { debug, allocatePort, sleep, uuid } from './util';
import type {
  DisaggregatedStorageOptions,
  ShardDescriptor,
} from './mongocluster';

const execFile = promisify(execFileCb);

/**
 * Helpers for the SLS (DSC) multi-cell docker compose
 * project shipped in the mongodb server repository
 * (buildscripts/modules/atlas/sls-multicell-docker-compose.yml).
 * Replicates the environment-variable setup performed by the
 * SLSMultiCellFixture in that codebase.
 */

/** Hostname through which SLS services are reachable from the host. */
export const SLS_HOSTNAME = 'local.sls.mmscloudteam.com';

const DEFAULT_SLS_IMAGE_REPO =
  '664315256653.dkr.ecr.us-east-1.amazonaws.com/disagg-storage/';

export interface SLSServiceInfo {
  /** Environment variable through which the compose file receives the host port. */
  portVar: string;
  /** Port the service listens on inside its container. */
  internalPort: number;
}

/**
 * Extract the host-exposed services and their port environment variables from
 * an SLS docker compose file. Matches `ports:` entries of the form
 * `"${SOME_PORT:-30001}:27998"`.
 */
export function parseSLSComposeServices(
  composeFileContents: string,
): Record<string, SLSServiceInfo[]> {
  const services: Record<string, SLSServiceInfo[]> = Object.create(null);
  let topLevelKey: string | undefined;
  let currentService: string | undefined;
  for (const line of composeFileContents.split('\n')) {
    let match;
    if ((match = /^(\w[\w.-]*):/.exec(line))) {
      topLevelKey = match[1];
      currentService = undefined;
    } else if (
      topLevelKey === 'services' &&
      (match = /^ {2}([\w.-]+):\s*$/.exec(line))
    ) {
      currentService = match[1];
    } else if (
      currentService &&
      (match = /\$\{([A-Z0-9_]+)(?::-\d+)?\}:(\d+)/.exec(line)) &&
      // Only 'ports:' list entries, not e.g. SERVER_URI environment values
      /^\s+-\s/.exec(line)
    ) {
      (services[currentService] ??= []).push({
        portVar: match[1],
        internalPort: +match[2],
      });
    }
  }
  return services;
}

export interface SLSCell {
  cell: string;
  zone: string;
}

export const SLS_CELL1: SLSCell = Object.freeze({
  cell: 'cell1',
  zone: 'zone1',
});
export const SLS_CELL2: SLSCell = Object.freeze({
  cell: 'cell2',
  zone: 'zone2',
});
export const SLS_CELL3: SLSCell = Object.freeze({
  cell: 'cell3',
  zone: 'zone3',
});

export interface SLSMultiCellEnvironmentOptions {
  /**
   * Path to the SLS multi-cell docker-compose.yml (typically
   * buildscripts/modules/atlas/sls-multicell-docker-compose.yml in a mongodb
   * server checkout). Files it references (slsbackup.proto,
   * flags-state.json) are resolved relative to it.
   */
  composeFile: string;
  /**
   * Image tag for the SLS images (typically the `pinned_sls_commit` from the
   * server repository's buildscripts/modules/atlas/manifest.json).
   */
  imageTag: string;
  /** Docker image repository for SLS images. */
  imageRepo?: string;
  /** Docker image repository for third-party images (default: imageRepo with 'disagg-storage' replaced by 'thirdparty'). */
  thirdPartyImageRepo?: string;
  /** Test run identifier, applied as a `testdata_id` label on all containers. */
  testDataId?: string;
  /** Host IP reachable from inside containers (compose default: 172.17.0.1). */
  hostInternalIP?: string;
}

export interface SLSMultiCellEnvironment {
  /** Path to the compose file in use. */
  composeFile: string;
  /** Environment variables to pass to the docker compose project. */
  env: Record<string, string>;
  /** Allocated host port for each service, keyed by service name. */
  ports: Record<string, number>;
  /** Host address and URI for each service, keyed by service name. */
  services: Record<string, { addr: string; uri: string }>;
}

/**
 * Allocate host ports and build the environment variables expected by an SLS
 * multi-cell compose file. The services and their port variables are parsed
 * from the compose file itself, so this stays compatible with whatever
 * version of the file is provided.
 */
export async function createSLSMultiCellEnvironment(
  options: SLSMultiCellEnvironmentOptions,
): Promise<SLSMultiCellEnvironment> {
  const { composeFile, imageTag } = options;

  const serviceInfo = parseSLSComposeServices(
    await fs.readFile(composeFile, 'utf8'),
  );
  if (!Object.keys(serviceInfo).length) {
    throw new Error(
      `Could not find any services with host port mappings in ${composeFile}`,
    );
  }

  const imageRepo = options.imageRepo ?? DEFAULT_SLS_IMAGE_REPO;
  const thirdPartyImageRepo =
    options.thirdPartyImageRepo ??
    imageRepo.replace('disagg-storage', 'thirdparty');

  const ports: Record<string, number> = Object.create(null);
  const env: Record<string, string> = Object.assign(Object.create(null), {
    SLS_IMAGE_REPO: imageRepo,
    THIRD_PARTY_IMAGE_REPO: thirdPartyImageRepo,
    SLS_IMAGE_TAG: imageTag,
    TESTDATA_ID: options.testDataId ?? '',
  });
  if (options.hostInternalIP) {
    env.HOST_INTERNAL_IP = options.hostInternalIP;
  }

  const services: Record<string, { addr: string; uri: string }> =
    Object.create(null);
  for (const [serviceName, infos] of Object.entries(serviceInfo)) {
    for (const [i, info] of infos.entries()) {
      const port = await allocatePort();
      env[info.portVar] = String(port);
      // The first host-exposed port is the service's main address.
      if (i === 0) {
        ports[serviceName] = port;
        const addr = `${SLS_HOSTNAME}:${port}`;
        services[serviceName] = { addr, uri: `http://${addr}` };
      }
    }
  }

  debug('created SLS multi-cell environment', { composeFile, ports });
  return { composeFile, env, ports, services };
}

export interface SLSDisaggregatedStorageConfigOptions {
  /** SLS log ID for this shard (must match the log started via StartLog). */
  logId: number;
  /** Cell metadata service to use (default: 'cms-cell1-0'). */
  cellMetadataService?: string;
  /** Zone the mongod nodes report themselves in (default: cell1's zone). */
  zoneName?: string;
  /** Path to an encryption key file, if encryption is used. */
  encryptionKeyFilePath?: string;
}

/**
 * Build the value for mongod's `disaggregatedStorageConfig` server parameter
 * for one shard, based on the SLS environment and the shard's pre-allocated
 * member ports. Pass this as the `config` callback of the cluster's
 * `disaggregatedStorage` options:
 *
 * ```
 * config: (shard) =>
 *   createSLSDisaggregatedStorageConfig(sls, shard, { logId: 1 + shard.index }),
 * ```
 */
export function createSLSDisaggregatedStorageConfig(
  sls: SLSMultiCellEnvironment,
  shard: ShardDescriptor,
  options: SLSDisaggregatedStorageConfigOptions,
): Record<string, unknown> {
  const cellMetadataService = options.cellMetadataService ?? 'cms-cell1-0';
  const cmsService = sls.services[cellMetadataService];
  if (!cmsService) {
    throw new Error(`Unknown cell metadata service: ${cellMetadataService}`);
  }
  return {
    // The server expects a BSON long here; the extended JSON wrapper survives
    // JSON.stringify, unlike a BSON.Long instance.
    logID: { $numberLong: String(options.logId) },
    myZoneName: options.zoneName ?? SLS_CELL1.zone,
    zones: [],
    cellMetadataServer: cmsService.uri,
    ...(options.encryptionKeyFilePath
      ? { encryptionKeyFilePath: options.encryptionKeyFilePath }
      : {}),
    ...(shard.replSetName
      ? {
          replSetConfig: {
            _id: shard.replSetName,
            version: 1,
            term: 1,
            members: shard.members.map((member, i) => ({
              _id: i,
              host: `${member.host}:${member.port}`,
              priority: member.priority,
            })),
          },
        }
      : {}),
  };
}

export interface SLSDisaggregatedStorageSetupOptions extends SLSMultiCellEnvironmentOptions {
  /** Compose project name (default: a generated unique name). */
  projectName?: string;
  /** How long to wait for the storage layer to become ready (default: 300s). */
  readyTimeoutSecs?: number;
  /**
   * SLS log ID assigned to the first shard; subsequent shards get consecutive
   * IDs (default: 1). Log ID 9999 is reserved by the cell metadata services.
   */
  firstLogId?: number;
  /**
   * Path to the encryption key file to use for DSC
   * encryption. If not provided, a key file with a well-known test key is
   * created in the OS temp directory (matching the server's jstest setup).
   */
  encryptionKeyFilePath?: string;
}

// Well-known test encryption key, matching createKeyFile() in the server
// repository's disagg_storage jstest library.
const TEST_ENCRYPTION_KEY = '3zKkqoh8BGyC5BnyMZOEXsuTCHTD286SeNXEXeMuMxM=';

async function createTestEncryptionKeyFile(): Promise<string> {
  const fileName = path.join(
    os.tmpdir(),
    `mongodb-runner-sls-decrypt-key-${uuid()}`,
  );
  await fs.writeFile(fileName, TEST_ENCRYPTION_KEY, { mode: 0o600 });
  return fileName;
}

/**
 * Create fully-populated `disaggregatedStorage` options for the SLS
 * multi-cell compose project from a mongodb server repository checkout:
 * environment variables, readiness polling (waiting for the testdriver
 * container's /ready marker), per-shard log creation (StartLog via grpcurl
 * in the testdriver container), and the mongod `disaggregatedStorageConfig`
 * server parameter.
 *
 * ```
 * const disaggregatedStorage = await createSLSDisaggregatedStorageOptions({
 *   composeFile: '/path/to/sls-multicell-docker-compose.yml',
 *   imageTag: '<pinned_sls_commit>',
 * });
 * const cluster = await MongoCluster.start({
 *   topology: 'replset',
 *   disaggregatedStorage,
 *   // ...
 * });
 * ```
 */
export async function createSLSDisaggregatedStorageOptions(
  options: SLSDisaggregatedStorageSetupOptions,
): Promise<DisaggregatedStorageOptions & { sls: SLSMultiCellEnvironment }> {
  const sls = await createSLSMultiCellEnvironment(options);
  const projectName = options.projectName ?? `mongodb-runner-sls-${uuid()}`;
  const testdriverContainer = `${projectName}-testdriver-1`;
  const firstLogId = options.firstLogId ?? 1;
  const encryptionKeyFilePath =
    options.encryptionKeyFilePath ?? (await createTestEncryptionKeyFile());

  const grpcurl = async (
    service: string,
    method: string,
    payload: unknown,
  ): Promise<any> => {
    const { stdout } = await execFile('docker', [
      'exec',
      testdriverContainer,
      '/grpcurl',
      '-plaintext',
      '-d',
      JSON.stringify(payload),
      service,
      method,
    ]);
    return stdout.trim() ? JSON.parse(stdout) : {};
  };

  return {
    sls,
    composeFile: sls.composeFile,
    env: { ...sls.env, COMPOSE_PROJECT_NAME: projectName },
    waitForReady: async () => {
      const timeoutSecs = options.readyTimeoutSecs ?? 300;
      const deadline = Date.now() + timeoutSecs * 1000;
      debug('waiting for SLS storage layer', { testdriverContainer });
      while (Date.now() < deadline) {
        try {
          await execFile('docker', [
            'exec',
            testdriverContainer,
            'test',
            '-f',
            '/ready',
          ]);
          debug('SLS storage layer is ready');
          return;
        } catch {
          await sleep(2000);
        }
      }
      throw new Error(`SLS storage layer not ready after ${timeoutSecs}s`);
    },
    setupShard: async ({ index }) => {
      const logId = firstLogId + index;
      debug('starting SLS log for shard', { index, logId });
      const res = await grpcurl(
        'crs-cell1-0:27996',
        'schedulerservice.v1.SchedulerService/GetLogServers',
        { cells: [SLS_CELL1, SLS_CELL2, SLS_CELL3] },
      );
      const serverIds = res.server_ids ?? res.serverIds ?? [];
      if (!serverIds.length) {
        throw new Error('SLS GetLogServers returned no servers');
      }
      try {
        await grpcurl(
          'crs-cell1-0:27996',
          'schedulerservice.v1.ControlPlaneService/StartLog',
          { log_id: logId, server_ids: serverIds, ancestry: { ancestors: [] } },
        );
      } catch (err) {
        // The storage layer's state persists while the compose project is
        // running, so the log may already exist from a previous run.
        const { stderr = '', stdout = '' } = (err ?? {}) as {
          stderr?: string;
          stdout?: string;
        };
        const output = `${stderr}${stdout}`;
        if (output.includes('already exists')) {
          debug('SLS log already exists, reusing it', { logId });
          return;
        }
        throw err;
      }
    },
    config: (shard) =>
      createSLSDisaggregatedStorageConfig(sls, shard, {
        logId: firstLogId + shard.index,
        encryptionKeyFilePath,
      }),
  };
}
