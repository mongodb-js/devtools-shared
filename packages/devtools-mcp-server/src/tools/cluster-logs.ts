import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Clusters } from '../clusters';
import { clusterLogsShape } from '../schema';
import { jsonResult } from './result';

export function registerClusterLogsTool(
  server: McpServer,
  clusters: Clusters,
): void {
  server.registerTool(
    'mongodb_cluster_logs',
    {
      title: 'Read cluster logs',
      description: `Returns the last lines of every mongod/mongos log file of a cluster, per server. Useful when a test against the cluster failed.

Clusters are started with a log directory by default (<runner dir>/logs); servers started without one have no logs to read. At most 1 MB is read from the end of each file.`,
      inputSchema: clusterLogsShape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (input) => {
      const logs = await clusters.logs(input);
      return jsonResult(
        { logs },
        `Read logs for ${logs.length} server(s) of cluster "${input.id}".`,
      );
    },
  );
}
