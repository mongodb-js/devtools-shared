import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Clusters } from '../clusters';
import type { Database } from '../database';
import { registerClusterLogsTool } from './cluster-logs';
import { registerFailPointTool } from './fail-point';
import { registerFixtureTools } from './fixtures';
import { registerGetClusterTool } from './get-cluster';
import { registerListClustersTool } from './list-clusters';
import { registerPruneClustersTool } from './prune-clusters';
import { registerRunCommandTool } from './run-command';
import { registerStartClusterTool } from './start-cluster';
import { registerStopClusterTool } from './stop-cluster';

export function registerTools(
  server: McpServer,
  clusters: Clusters,
  database: Database,
): void {
  registerStartClusterTool(server, clusters);
  registerListClustersTool(server, clusters);
  registerGetClusterTool(server, clusters);
  registerClusterLogsTool(server, clusters);
  registerStopClusterTool(server, clusters);
  registerPruneClustersTool(server, clusters);
  registerRunCommandTool(server, database);
  registerFixtureTools(server, database);
  registerFailPointTool(server, database);
}
