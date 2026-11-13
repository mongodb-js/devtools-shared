import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Database } from '../database';
import { loadFixtureShape, saveFixtureShape } from '../schema';
import { jsonResult } from './result';

const target =
  'The cluster is resolved from its id in the mongodb-runner registry, so no connection string or credentials are needed.';

export function registerFixtureTools(
  server: McpServer,
  database: Database,
): void {
  server.registerTool(
    'mongodb_save_fixture',
    {
      title: 'Save a fixture',
      description: `Writes the documents of a collection to an Extended JSON file so the fixture can be reused later or committed to the repository. ${target}

Without a path, the file goes to .devtools-mcp/fixtures/<database>.<collection>.ejson in the working directory.`,
      inputSchema: saveFixtureShape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (input) => {
      const result = await database.saveFixture(input);
      return jsonResult(
        { ...result },
        `Saved ${result.documentCount} document(s) to ${result.path}.`,
      );
    },
  );

  server.registerTool(
    'mongodb_load_fixture',
    {
      title: 'Load a fixture',
      description: `Inserts the documents of an Extended JSON fixture file into a collection. ${target}

Without a path, the file is read from .devtools-mcp/fixtures/<database>.<collection>.ejson in the working directory. Set drop to true to empty the collection first.`,
      inputSchema: loadFixtureShape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (input) => {
      const result = await database.loadFixture(input);
      return jsonResult(
        { ...result },
        `Inserted ${result.insertedCount} document(s) from ${result.path}${result.dropped ? ' (collection dropped first)' : ''}.`,
      );
    },
  );
}
