import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Clusters } from '../clusters';
import { getClusterShape } from '../schema';
import { jsonResult } from './result';

export function registerGetClusterTool(
  server: McpServer,
  clusters: Clusters,
): void {
  server.registerTool(
    'mongodb_get_cluster',
    {
      title: 'Get cluster status',
      description: `Inspects a cluster by id: whether it is reachable, its topology, every server's host and port, the log directory and the mongod version and variant.

Unlike mongodb_list_clusters, which only reads the runner registry, this connects to the cluster. "running": false means the registry entry is stale; mongodb_prune_stale_clusters removes those entries.`,
      inputSchema: getClusterShape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (input) => {
      const result = await clusters.get(input);
      const summary = result.running
        ? `Cluster "${result.id}" is running (MongoDB ${result.version ?? 'unknown'}, ${result.variant ?? 'unknown'}).`
        : `Cluster "${result.id}" is not reachable: ${result.error ?? 'unknown error'}`;
      return jsonResult({ ...result }, summary);
    },
  );
}
