import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Clusters } from '../clusters';
import { startClusterShape } from '../schema';
import { jsonResult } from './result';
import { createStartProgress } from './start-progress';

const description = `Starts a MongoDB deployment on the local machine with mongodb-runner and returns its id and connection string.

The deployment keeps running after this tool returns and independently of this MCP server; stop it with mongodb_stop_cluster. Server ports are allocated automatically unless --port is passed in args. The first start for a given version downloads the MongoDB binaries, which can take several minutes.

Supported deployments:
- standalone: a single mongod.
- replset: a replica set. Use secondaries/arbiters for a homogeneous set, or rsMembers for full control (analytics nodes are members with tags { "nodeType": "ANALYTICS" } and priority 0).
- sharded: a config server replica set, shard replica sets and mongos routers. shards takes a count or a per-shard configuration list; mongosArgs configures each router.
- DSC: pass slsDir (and a disaggregated-storage-capable build via binDir or downloadUrl) to back the cluster with the SLS storage layer. Requires Docker with compose v2.

Options that do not apply to the selected topology are ignored.

Progress notifications are sent while the cluster starts when the client supplies a progress token with the request.`;

export function registerStartClusterTool(
  server: McpServer,
  clusters: Clusters,
): void {
  server.registerTool(
    'mongodb_start_cluster',
    {
      title: 'Start a MongoDB cluster',
      description,
      inputSchema: startClusterShape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (input, extra) => {
      const progress = createStartProgress(extra);
      try {
        await progress.report(
          `Starting ${input.topology} cluster. This can take several minutes if the MongoDB binaries need to be downloaded.`,
        );
        const result = await clusters.start(input);
        await progress.report(`Cluster "${result.id}" is ready.`);
        return jsonResult(
          { ...result },
          `Started ${result.topology} cluster "${result.id}". Connection string: ${result.connectionString}`,
        );
      } finally {
        progress.stop();
      }
    },
  );
}
