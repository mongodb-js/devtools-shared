import { expect } from 'chai';
import assert from 'assert';
import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';
import { BSON, type Document, type MongoClient } from 'mongodb';
import {
  createDatabase,
  defaultFixturePath,
  type WithClient,
} from './database';

type Call = { method: string; args: unknown[] };

function createFakeMongo(
  options: {
    findDocuments?: Document[];
    dropResult?: boolean;
    commandResult?: Document;
  } = {},
) {
  const calls: Call[] = [];

  const collection = {
    find: (filter: Document, findOptions: unknown) => {
      calls.push({ method: 'find', args: [filter, findOptions] });
      return { toArray: async () => options.findDocuments ?? [] };
    },
    insertMany: async (documents: Document[], insertOptions: unknown) => {
      calls.push({ method: 'insertMany', args: [documents, insertOptions] });
      const insertedIds = Object.fromEntries(
        documents.map((_, index) => [
          index,
          new BSON.ObjectId('65f0c0ffee00c0ffee00c0ff'),
        ]),
      );
      return { insertedCount: documents.length, insertedIds };
    },
    drop: async () => {
      calls.push({ method: 'drop', args: [] });
      return options.dropResult ?? true;
    },
  };

  const client = {
    db: (databaseName: string) => ({
      collection: (collectionName: string) => {
        calls.push({
          method: 'collection',
          args: [databaseName, collectionName],
        });
        return collection;
      },
      command: async (command: Document) => {
        calls.push({ method: 'command', args: [databaseName, command] });
        return options.commandResult ?? { ok: 1 };
      },
    }),
  } as unknown as MongoClient;

  const withClient: WithClient = async (clusterId, fn) => {
    calls.push({ method: 'withClient', args: [clusterId] });
    return fn(client);
  };

  return { calls, withClient };
}

function call(calls: Call[], method: string): Call {
  const found = calls.find((entry) => entry.method === method);
  if (!found) throw new Error(`Expected a ${method} call`);
  return found;
}

describe('createDatabase', function () {
  it('runs commands against the requested database and serializes the result', async function () {
    const { calls, withClient } = createFakeMongo({
      commandResult: { ok: 1, values: ['a'] },
    });
    const database = createDatabase({ withClient });

    const result = await database.runCommand({
      clusterId: 'cluster-1',
      database: 'admin',
      command: { distinct: 'users', key: 'name' },
    });

    expect(call(calls, 'withClient').args).to.deep.equal(['cluster-1']);
    expect(call(calls, 'command').args).to.deep.equal([
      'admin',
      { distinct: 'users', key: 'name' },
    ]);
    expect(result).to.deep.equal({
      result: { ok: { $numberInt: '1' }, values: ['a'] },
    });
  });

  it('saves a fixture as canonical Extended JSON on disk', async function () {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-fixture-'));
    const filePath = path.join(dir, 'nested', 'users.ejson');

    try {
      const { withClient } = createFakeMongo({
        findDocuments: [
          { _id: new BSON.ObjectId('65f0c0ffee00c0ffee00c0ff'), n: 1 },
        ],
      });
      const database = createDatabase({ withClient });

      const result = await database.saveFixture({
        clusterId: 'cluster-1',
        database: 'app',
        collection: 'users',
        path: filePath,
      });

      expect(result).to.deep.equal({ path: filePath, documentCount: 1 });
      const written = JSON.parse(await fs.readFile(filePath, 'utf8'));
      expect(written).to.include({ database: 'app', collection: 'users' });
      expect(written.documents).to.deep.equal([
        { _id: { $oid: '65f0c0ffee00c0ffee00c0ff' }, n: { $numberInt: '1' } },
      ]);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('loads a fixture, optionally dropping the collection first', async function () {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-fixture-'));
    const filePath = path.join(dir, 'users.ejson');
    await fs.writeFile(
      filePath,
      JSON.stringify([
        { _id: { $oid: '65f0c0ffee00c0ffee00c0ff' }, n: { $numberInt: '1' } },
      ]),
    );

    try {
      const { calls, withClient } = createFakeMongo();
      const database = createDatabase({ withClient });

      const result = await database.loadFixture({
        clusterId: 'cluster-1',
        database: 'app',
        collection: 'users',
        path: filePath,
        drop: true,
      });

      expect(result).to.deep.equal({
        path: filePath,
        insertedCount: 1,
        dropped: true,
      });
      expect(calls.some((entry) => entry.method === 'drop')).to.be.true;
      const [documents] = call(calls, 'insertMany').args as [
        Document[],
        unknown,
      ];
      expect(documents[0]._id).to.be.instanceOf(BSON.ObjectId);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects a fixture file without a documents array', async function () {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-fixture-'));
    const filePath = path.join(dir, 'broken.ejson');
    await fs.writeFile(filePath, JSON.stringify({ nope: true }));

    try {
      const { withClient } = createFakeMongo();
      const database = createDatabase({ withClient });

      await assert.rejects(
        database.loadFixture({
          clusterId: 'cluster-1',
          database: 'app',
          collection: 'users',
          path: filePath,
        }),
        /does not contain a documents array/,
      );
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('derives the default fixture path from the database and collection', function () {
    expect(defaultFixturePath('app', 'users')).to.equal(
      path.resolve(process.cwd(), '.devtools-mcp/fixtures/app.users.ejson'),
    );
  });

  it('fails with a helpful message for an unknown cluster id', async function () {
    const database = createDatabase({
      runnerDir: '/tmp/devtools-mcp-server-missing-runner-dir',
    });

    await assert.rejects(
      database.runCommand({
        clusterId: 'missing',
        database: 'admin',
        command: { ping: 1 },
      }),
      /No running cluster with id "missing"/,
    );
  });
});
