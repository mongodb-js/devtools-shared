import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Clusters } from '../clusters';
import { stopClusterShape } from '../schema';
import { jsonResult } from './result';

export function registerStopClusterTool(
  server: McpServer,
  clusters: Clusters,
): void {
  server.registerTool(
    'mongodb_stop_cluster',
    {
      title: 'Stop MongoDB clusters',
      description: `Stops a MongoDB cluster by id, or every cluster in the mongodb-runner registry when all is true.

The registry is shared with the mongodb-runner CLI, so all: true also stops clusters started outside this server. Pass id (from mongodb_start_cluster or mongodb_list_clusters) to stop a single cluster.`,
      inputSchema: stopClusterShape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (input) => {
      const result = await clusters.stop(input);
      const summary =
        result.stopped.length === 0
          ? 'No clusters were running.'
          : `Stopped ${result.stopped.length} cluster(s): ${result.stopped.join(', ')}`;
      return jsonResult({ ...result }, summary);
    },
  );
}
