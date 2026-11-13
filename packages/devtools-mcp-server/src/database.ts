import path from 'path';
import { promises as fs } from 'fs';
import { MongoServerError, type MongoClient } from 'mongodb';
import { findStoredCluster, resolveRunnerDir } from './registry';
import { withClusterClient } from './connection';
import { fromEjson, toEjson } from './ejson';
import type {
  LoadFixtureInput,
  RunCommandInput,
  SaveFixtureInput,
} from './schema';

export const FIXTURE_DIR = '.devtools-mcp/fixtures';

export type RunCommandResult = {
  result: unknown;
};

export type SaveFixtureResult = {
  path: string;
  documentCount: number;
};

export type LoadFixtureResult = {
  path: string;
  insertedCount: number;
  dropped: boolean;
};

/**
 * The database operations that do not have an equivalent in the official
 * MongoDB MCP server: arbitrary commands (e.g. fail points) and fixture files.
 */
export interface Database {
  runCommand(input: RunCommandInput): Promise<RunCommandResult>;
  saveFixture(input: SaveFixtureInput): Promise<SaveFixtureResult>;
  loadFixture(input: LoadFixtureInput): Promise<LoadFixtureResult>;
}

/**
 * Opens a client for a cluster id and closes it again once `fn` is done. This
 * is the seam the tools are tested through; the default implementation
 * resolves the id in the mongodb-runner registry.
 */
export type WithClient = <T>(
  clusterId: string,
  fn: (client: MongoClient) => Promise<T>,
) => Promise<T>;

function isNamespaceNotFound(error: unknown): boolean {
  return (
    error instanceof MongoServerError &&
    (error.codeName === 'NamespaceNotFound' || Number(error.code) === 26)
  );
}

/** Fixtures without an explicit path go to `<cwd>/.devtools-mcp/fixtures`. */
export function defaultFixturePath(
  database: string,
  collection: string,
): string {
  const safeName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_');
  return path.resolve(
    process.cwd(),
    FIXTURE_DIR,
    `${safeName(database)}.${safeName(collection)}.ejson`,
  );
}

export function createDatabase({
  runnerDir = resolveRunnerDir(),
  withClient,
}: { runnerDir?: string; withClient?: WithClient } = {}): Database {
  const client: WithClient =
    withClient ??
    (async (clusterId, fn) => {
      const stored = await findStoredCluster(runnerDir, clusterId);
      return withClusterClient(stored.serialized, fn);
    });

  function collectionOf(input: {
    clusterId: string;
    database: string;
    collection: string;
  }) {
    return (mongo: MongoClient) =>
      mongo.db(input.database).collection(input.collection);
  }

  async function runCommand(input: RunCommandInput): Promise<RunCommandResult> {
    return client(input.clusterId, async (mongo) => {
      const result = await mongo
        .db(input.database)
        .command(fromEjson(input.command));
      return { result: toEjson(result) };
    });
  }

  async function saveFixture(
    input: SaveFixtureInput,
  ): Promise<SaveFixtureResult> {
    const filePath = input.path
      ? path.resolve(input.path)
      : defaultFixturePath(input.database, input.collection);

    return client(input.clusterId, async (mongo) => {
      const documents = await collectionOf(input)(mongo)
        .find(
          fromEjson(input.filter ?? {}),
          input.limit ? { limit: input.limit } : {},
        )
        .toArray();
      const payload = {
        database: input.database,
        collection: input.collection,
        savedAt: new Date().toISOString(),
        documents: documents.map(toEjson),
      };
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`);
      return { path: filePath, documentCount: documents.length };
    });
  }

  async function loadFixture(
    input: LoadFixtureInput,
  ): Promise<LoadFixtureResult> {
    const filePath = input.path
      ? path.resolve(input.path)
      : defaultFixturePath(input.database, input.collection);

    const parsed: unknown = JSON.parse(await fs.readFile(filePath, 'utf8'));
    const documents = Array.isArray(parsed)
      ? parsed
      : (parsed as { documents?: unknown }).documents;
    if (!Array.isArray(documents)) {
      throw new Error(
        `Fixture file "${filePath}" does not contain a documents array.`,
      );
    }

    return client(input.clusterId, async (mongo) => {
      const col = collectionOf(input)(mongo);
      let dropped = false;
      if (input.drop) {
        dropped = await col.drop().catch((error: unknown) => {
          if (isNamespaceNotFound(error)) return false;
          throw error;
        });
      }
      const result = documents.length
        ? await col.insertMany(
            documents.map(fromEjson),
            input.ordered === undefined ? {} : { ordered: input.ordered },
          )
        : undefined;
      return {
        path: filePath,
        insertedCount: result?.insertedCount ?? 0,
        dropped,
      };
    });
  }

  return { runCommand, saveFixture, loadFixture };
}
