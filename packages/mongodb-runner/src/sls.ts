import { once } from 'events';
import { createServer } from 'net';
import type { AddressInfo } from 'net';
import path from 'path';
import { debug } from './util';

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

async function allocatePort(): Promise<number> {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address() as AddressInfo;
  await new Promise((resolve) => server.close(resolve));
  return port;
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
