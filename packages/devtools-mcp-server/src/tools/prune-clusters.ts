import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Clusters } from '../clusters';
import { jsonResult } from './result';

export function registerPruneClustersTool(
  server: McpServer,
  clusters: Clusters,
): void {
  server.registerTool(
    'mongodb_prune_stale_clusters',
    {
      title: 'Prune stale clusters',
      description: `Removes registry entries for clusters that are no longer reachable, so mongodb_list_clusters stops reporting them. Only metadata is deleted; nothing is stopped.`,
      inputSchema: {},
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      const result = await clusters.prune();
      const summary =
        result.removed.length === 0
          ? 'No stale clusters found.'
          : `Removed ${result.removed.length} stale cluster(s): ${result.removed.join(', ')}`;
      return jsonResult({ ...result }, summary);
    },
  );
}
