import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createClusters, type Clusters } from './clusters';
import { createDatabase, type Database } from './database';
import { registerTools } from './tools';

export {
  createClusters,
  DEFAULT_RUNNER_DIR,
  resolveRunnerDir,
} from './clusters';
export { createDatabase, defaultFixturePath, FIXTURE_DIR } from './database';
export {
  inspectCluster,
  SERVER_SELECTION_TIMEOUT_MS,
  withClusterClient,
} from './connection';
export { findStoredCluster, flattenServers } from './registry';
export type { Database, WithClient } from './database';
export type {
  Clusters,
  ClusterDetails,
  ClusterLogsInput,
  ClusterServer,
  ClusterSummary,
  PruneClustersResult,
  RunnerApi,
  StartClusterResult,
  StopClustersResult,
  StoredCluster,
  Topology,
} from './clusters';
export type {
  ClusterInspection,
  ClusterInspector,
  ClusterVariant,
} from './connection';
export type { ServerLog } from './logs';

export interface CreateServerOptions {
  /** Overridable for tests; defaults to the real mongodb-runner backed implementation. */
  clusters?: Clusters;
  /** Overridable for tests; defaults to the real mongodb-runner backed implementation. */
  database?: Database;
}

/**
 * Creates the DevTools MCP server with the mongodb-runner cluster and data
 * tools registered. No transport is attached, see `bin.ts` for the stdio
 * entrypoint.
 */
export function createServer({
  clusters = createClusters(),
  database = createDatabase(),
}: CreateServerOptions = {}): McpServer {
  const server = new McpServer({
    name: 'devtools-mcp-server',
    // Read at runtime so the reported version matches the installed package.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    version: require('../package.json').version,
  });

  registerTools(server, clusters, database);

  return server;
}
