import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Database } from '../database';
import { runCommandShape } from '../schema';
import { jsonResult } from './result';

const target =
  'The cluster is resolved from its id in the mongodb-runner registry, so no connection string or credentials are needed.';

const ejson =
  'The command document is Extended JSON: plain JSON works for standard values, and {"$oid": ...} or {"$date": ...} are accepted for BSON types. Results are returned as canonical Extended JSON.';

export function registerRunCommandTool(
  server: McpServer,
  database: Database,
): void {
  server.registerTool(
    'mongodb_run_command',
    {
      title: 'Run a database command',
      description: `Runs an arbitrary database command against a cluster, for operations the MongoDB MCP server tools do not cover (fail points, collMod, distinct, ...). Commands can change data or server configuration. ${target} ${ejson}`,
      inputSchema: runCommandShape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (input) => {
      const result = await database.runCommand(input);
      return jsonResult(
        { ...result },
        `Command executed on database "${input.database}".`,
      );
    },
  );
}
