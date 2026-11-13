import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Clusters } from '../clusters';
import { jsonResult } from './result';

export function registerListClustersTool(
  server: McpServer,
  clusters: Clusters,
): void {
  server.registerTool(
    'mongodb_list_clusters',
    {
      title: 'List MongoDB clusters',
      description: `Lists the MongoDB clusters tracked in the mongodb-runner registry, sorted by start time. The registry is shared with the mongodb-runner CLI, so clusters started by either one are included.

Each entry contains the cluster id, its connection string and its topology. Entries are read from the registry without contacting the servers: a cluster that crashed can still be listed until it is stopped.`,
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      const result = await clusters.list();
      const summary =
        result.length === 0
          ? 'No MongoDB clusters are running.'
          : `${result.length} running MongoDB cluster(s).`;
      return jsonResult({ clusters: result }, summary);
    },
  );
}
