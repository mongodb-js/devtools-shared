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
 * Helpers for the SLS (disaggregated storage) multi-cell docker compose
 * project bundled with this package. Replicates the environment-variable
 * setup performed by the SLSMultiCellFixture in the mongodb server codebase.
 */

/** Hostname through which SLS services are reachable from the host. */
export const SLS_HOSTNAME = 'local.sls.mmscloudteam.com';

/** Path to the bundled SLS multi-cell compose file. */
export const SLS_MULTICELL_COMPOSE_FILE = path.resolve(
  __dirname,
  '..',
  'assets',
  'sls-multicell-docker-compose.yml',
);

const DEFAULT_SLS_IMAGE_REPO =
  '664315256653.dkr.ecr.us-east-1.amazonaws.com/disagg-storage/';

export interface SLSServiceInfo {
  /** Environment variable through which the compose file receives the host port. */
  portVar: string;
  /** Port the service listens on inside its container. */
  internalPort: number;
}

/** All host-exposed services in the SLS multi-cell compose file. */
export const SLS_MULTICELL_SERVICES: Record<string, SLSServiceInfo> =
  Object.assign(Object.create(null), {
    'logd-cell1-0': { portVar: 'LOGD_CELL1_0_PORT', internalPort: 27998 },
    'logd-cell2-0': { portVar: 'LOGD_CELL2_0_PORT', internalPort: 27998 },
    'logd-cell3-0': { portVar: 'LOGD_CELL3_0_PORT', internalPort: 27998 },
    'paged-cell1-0': { portVar: 'PAGED_CELL1_0_PORT', internalPort: 27999 },
    'paged-cell1-1': { portVar: 'PAGED_CELL1_1_PORT', internalPort: 27999 },
    'paged-cell1-2': { portVar: 'PAGED_CELL1_2_PORT', internalPort: 27999 },
    'paged-cell2-0': { portVar: 'PAGED_CELL2_0_PORT', internalPort: 27999 },
    'paged-cell2-1': { portVar: 'PAGED_CELL2_1_PORT', internalPort: 27999 },
    'paged-cell2-2': { portVar: 'PAGED_CELL2_2_PORT', internalPort: 27999 },
    'paged-cell3-0': { portVar: 'PAGED_CELL3_0_PORT', internalPort: 27999 },
    'paged-cell3-1': { portVar: 'PAGED_CELL3_1_PORT', internalPort: 27999 },
    'paged-cell3-2': { portVar: 'PAGED_CELL3_2_PORT', internalPort: 27999 },
    'pagematd-cell1-0': {
      portVar: 'PAGEMATD_CELL1_0_PORT',
      internalPort: 30000,
    },
    'pagematd-cell2-0': {
      portVar: 'PAGEMATD_CELL2_0_PORT',
      internalPort: 30000,
    },
    'pagematd-cell3-0': {
      portVar: 'PAGEMATD_CELL3_0_PORT',
      internalPort: 30000,
    },
    'cms-cell1-0': { portVar: 'CMS_CELL1_0_PORT', internalPort: 27995 },
    'cms-cell2-0': { portVar: 'CMS_CELL2_0_PORT', internalPort: 27995 },
    'cms-cell3-0': { portVar: 'CMS_CELL3_0_PORT', internalPort: 27995 },
    'crs-cell1-0': { portVar: 'CRS_CELL1_0_PORT', internalPort: 27996 },
    'crs-cell2-0': { portVar: 'CRS_CELL2_0_PORT', internalPort: 27996 },
    'crs-cell3-0': { portVar: 'CRS_CELL3_0_PORT', internalPort: 27996 },
    objectindexd: { portVar: 'OBJECTINDEXD_PORT', internalPort: 30003 },
    objectreadproxyd: { portVar: 'OBJECTREADPROXYD_PORT', internalPort: 30006 },
    'infra.localstack': {
      portVar: 'INFRA_LOCALSTACK_PORT',
      internalPort: 4566,
    },
    backupmock: { portVar: 'MOCKBACKUP_PORT', internalPort: 4770 },
    'backupmock-stub': { portVar: 'MOCKBACKUP_STUB_PORT', internalPort: 4771 },
  });

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
  /** Docker image repository for SLS images. */
  imageRepo?: string;
  /** Docker image repository for third-party images (default: imageRepo with 'disagg-storage' replaced by 'thirdparty'). */
  thirdPartyImageRepo?: string;
  /** Image tag for the SLS images. */
  imageTag?: string;
  /** Test run identifier, applied as a `testdata_id` label on all containers. */
  testDataId?: string;
  /** Host IP reachable from inside containers (compose default: 172.17.0.1). */
  hostInternalIP?: string;
}

export interface SLSMultiCellEnvironment {
  /** Path to the bundled compose file. */
  composeFile: string;
  /** Environment variables to pass to the docker compose project. */
  env: Record<string, string>;
  /** Allocated host port for each service, keyed by service name. */
  ports: Record<string, number>;
  /** Host address and URI for each service, keyed by service name. */
  services: Record<string, { addr: string; uri: string }>;
}

/**
 * Allocate host ports and build the environment variables expected by the
 * bundled SLS multi-cell compose file.
 */
export async function createSLSMultiCellEnvironment(
  options: SLSMultiCellEnvironmentOptions = {},
): Promise<SLSMultiCellEnvironment> {
  const imageRepo = options.imageRepo ?? DEFAULT_SLS_IMAGE_REPO;
  const thirdPartyImageRepo =
    options.thirdPartyImageRepo ??
    imageRepo.replace('disagg-storage', 'thirdparty');
  const imageTag = options.imageTag ?? 'latest';

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

  for (const [serviceName, info] of Object.entries(SLS_MULTICELL_SERVICES)) {
    const port = await allocatePort();
    ports[serviceName] = port;
    env[info.portVar] = String(port);
  }

  const services: Record<string, { addr: string; uri: string }> =
    Object.create(null);
  for (const serviceName of Object.keys(SLS_MULTICELL_SERVICES)) {
    const addr = `${SLS_HOSTNAME}:${ports[serviceName]}`;
    services[serviceName] = { addr, uri: `http://${addr}` };
  }

  debug('created SLS multi-cell environment', { ports });
  return { composeFile: SLS_MULTICELL_COMPOSE_FILE, env, ports, services };
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
    logID: options.logId,
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
}

/**
 * Create fully-populated `disaggregatedStorage` options for the bundled SLS
 * multi-cell compose project: environment variables, readiness polling
 * (waiting for the testdriver container's /ready marker), per-shard log
 * creation (StartLog via grpcurl in the testdriver container), and the
 * mongod `disaggregatedStorageConfig` server parameter.
 *
 * ```
 * const disaggregatedStorage = await createSLSDisaggregatedStorageOptions({
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
  options: SLSDisaggregatedStorageSetupOptions = {},
): Promise<DisaggregatedStorageOptions & { sls: SLSMultiCellEnvironment }> {
  const sls = await createSLSMultiCellEnvironment(options);
  const projectName = options.projectName ?? `mongodb-runner-sls-${uuid()}`;
  const testdriverContainer = `${projectName}-testdriver-1`;
  const firstLogId = options.firstLogId ?? 1;

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
      }),
  };
}
