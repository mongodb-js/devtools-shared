import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Database } from '../database';
import { failPointShape } from '../schema';
import { jsonResult } from './result';

export function registerFailPointTool(
  server: McpServer,
  database: Database,
): void {
  server.registerTool(
    'mongodb_fail_point',
    {
      title: 'Configure a fail point',
      description: `Configures a server fail point, e.g. name "failCommand" with mode "alwaysOn" and data making writes fail.

The cluster must have been started with test commands enabled, e.g. args ["--setParameter", "enableTestCommands=true"]. Turn the fail point off again with mode "off".`,
      inputSchema: failPointShape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (input) => {
      const result = await database.runCommand({
        clusterId: input.clusterId,
        database: 'admin',
        command: {
          configureFailPoint: input.name,
          mode: input.mode,
          ...(input.data ? { data: input.data } : {}),
        },
      });
      return jsonResult(
        { ...result },
        `Fail point "${input.name}" configured on cluster "${input.clusterId}".`,
      );
    },
  );
}
