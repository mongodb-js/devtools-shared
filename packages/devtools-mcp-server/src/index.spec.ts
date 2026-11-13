import { expect } from 'chai';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { Clusters } from './clusters';
import type { Database } from './database';
import { createServer } from './index';

function createFakeClusters(overrides: Partial<Clusters> = {}): Clusters {
  return {
    start: async (input) => ({
      id: input.id ?? 'generated-id',
      connectionString: 'mongodb://127.0.0.1:27017/?replicaSet=repl0',
      topology: input.topology,
      replSetName: 'repl0',
    }),
    list: async () => [],
    stop: async () => ({ stopped: [] }),
    get: async (input) => ({
      id: input.id,
      connectionString: 'mongodb://127.0.0.1:27017/',
      topology: 'standalone',
      running: true,
      servers: [],
    }),
    prune: async () => ({ removed: [] }),
    logs: async () => [],
    ...overrides,
  };
}

function createFakeDatabase(overrides: Partial<Database> = {}): Database {
  return {
    runCommand: async () => ({ result: {} }),
    saveFixture: async () => ({ path: '/tmp/fixture.ejson', documentCount: 0 }),
    loadFixture: async () => ({
      path: '/tmp/fixture.ejson',
      insertedCount: 0,
      dropped: false,
    }),
    ...overrides,
  };
}

describe('createServer', function () {
  let client: Client;

  async function connect(
    clusters: Clusters,
    database: Database = createFakeDatabase(),
  ): Promise<void> {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await createServer({ clusters, database }).connect(serverTransport);
    client = new Client({ name: 'test-client', version: '1.0.0' });
    await client.connect(clientTransport);
  }

  afterEach(async function () {
    await client?.close();
  });

  it('advertises the devtools tools', async function () {
    await connect(createFakeClusters());

    const { tools } = await client.listTools();

    expect(tools.map((tool) => tool.name)).to.have.members([
      'mongodb_start_cluster',
      'mongodb_list_clusters',
      'mongodb_get_cluster',
      'mongodb_cluster_logs',
      'mongodb_stop_cluster',
      'mongodb_prune_stale_clusters',
      'mongodb_run_command',
      'mongodb_save_fixture',
      'mongodb_load_fixture',
      'mongodb_fail_point',
    ]);
  });

  it('passes start options through and returns id and connection string', async function () {
    let received: unknown;
    await connect(
      createFakeClusters({
        start: async (input) => {
          received = input;
          return {
            id: 'my-cluster',
            connectionString: 'mongodb://127.0.0.1:27017/',
            topology: input.topology,
          };
        },
      }),
    );

    const result = await client.callTool({
      name: 'mongodb_start_cluster',
      arguments: {
        topology: 'sharded',
        id: 'my-cluster',
        shards: 2,
        mongosArgs: [['--setParameter', 'enableTestCommands=1']],
      },
    });

    expect(received).to.include({
      topology: 'sharded',
      id: 'my-cluster',
      shards: 2,
    });
    expect(result.isError).to.be.undefined;
    expect(result.structuredContent).to.deep.equal({
      id: 'my-cluster',
      connectionString: 'mongodb://127.0.0.1:27017/',
      topology: 'sharded',
    });
  });

  it('sends progress notifications when the client asks for them', async function () {
    await connect(createFakeClusters());
    const updates: { progress: number; message?: string }[] = [];

    const result = await client.callTool(
      {
        name: 'mongodb_start_cluster',
        arguments: { topology: 'standalone' },
      },
      undefined,
      { onprogress: (update) => updates.push(update) },
    );

    expect(result.isError).to.be.undefined;
    expect(updates).to.deep.equal([
      {
        progress: 1,
        message:
          'Starting standalone cluster. This can take several minutes if the MongoDB binaries need to be downloaded.',
      },
      { progress: 2, message: 'Cluster "generated-id" is ready.' },
    ]);
  });

  it('rejects invalid start input before reaching the clusters implementation', async function () {
    let called = false;
    await connect(
      createFakeClusters({
        start: async () => {
          called = true;
          throw new Error('should not be called');
        },
      }),
    );

    const result = await client.callTool({
      name: 'mongodb_start_cluster',
      arguments: { topology: 'sharded', shards: 0 },
    });

    expect(result.isError).to.be.true;
    expect(called).to.be.false;
  });

  it('passes run_command input through and returns the result', async function () {
    let received: unknown;
    await connect(
      createFakeClusters(),
      createFakeDatabase({
        runCommand: async (input) => {
          received = input;
          return { result: { ok: { $numberInt: '1' } } };
        },
      }),
    );

    const result = await client.callTool({
      name: 'mongodb_run_command',
      arguments: {
        clusterId: 'cluster-1',
        database: 'admin',
        command: { configureFailPoint: 'failCommand', mode: 'off' },
      },
    });

    expect(received).to.deep.equal({
      clusterId: 'cluster-1',
      database: 'admin',
      command: { configureFailPoint: 'failCommand', mode: 'off' },
    });
    expect(result.structuredContent).to.deep.equal({
      result: { ok: { $numberInt: '1' } },
    });
  });

  it('lists clusters as structured content', async function () {
    await connect(
      createFakeClusters({
        list: async () => [
          {
            id: 'a',
            connectionString: 'mongodb://127.0.0.1:27017/',
            topology: 'standalone',
            startedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
    );

    const result = await client.callTool({
      name: 'mongodb_list_clusters',
      arguments: {},
    });

    expect(result.structuredContent).to.deep.equal({
      clusters: [
        {
          id: 'a',
          connectionString: 'mongodb://127.0.0.1:27017/',
          topology: 'standalone',
          startedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
  });

  it('stops clusters and reports the stopped ids', async function () {
    const stopInputs: unknown[] = [];
    await connect(
      createFakeClusters({
        stop: async (input) => {
          stopInputs.push(input);
          return { stopped: ['a'] };
        },
      }),
    );

    const result = await client.callTool({
      name: 'mongodb_stop_cluster',
      arguments: { id: 'a' },
    });

    expect(stopInputs).to.deep.equal([{ id: 'a' }]);
    expect(result.structuredContent).to.deep.equal({ stopped: ['a'] });
  });

  it('surfaces stop failures as tool errors', async function () {
    await connect(
      createFakeClusters({
        stop: async () => {
          throw new Error('No running cluster with id "missing".');
        },
      }),
    );

    const result = await client.callTool({
      name: 'mongodb_stop_cluster',
      arguments: { id: 'missing' },
    });

    expect(result.isError).to.be.true;
    expect(result.content).to.deep.equal([
      { type: 'text', text: 'No running cluster with id "missing".' },
    ]);
  });

  it('reports cluster status through mongodb_get_cluster', async function () {
    await connect(
      createFakeClusters({
        get: async (input) => ({
          id: input.id,
          connectionString: 'mongodb://127.0.0.1:27017/',
          topology: 'replset',
          replSetName: 'repl0',
          running: true,
          servers: [{ host: '127.0.0.1', port: 27017, type: 'mongod' }],
          version: '8.2.1',
          variant: 'community',
        }),
      }),
    );

    const result = await client.callTool({
      name: 'mongodb_get_cluster',
      arguments: { id: 'a' },
    });

    expect(result.isError).to.be.undefined;
    expect(result.structuredContent).to.deep.equal({
      id: 'a',
      connectionString: 'mongodb://127.0.0.1:27017/',
      topology: 'replset',
      replSetName: 'repl0',
      running: true,
      servers: [{ host: '127.0.0.1', port: 27017, type: 'mongod' }],
      version: '8.2.1',
      variant: 'community',
    });
    expect((result.content[0] as { text: string }).text).to.match(
      /Cluster "a" is running \(MongoDB 8\.2\.1, community\)\./,
    );
  });

  it('prunes stale clusters and reads logs', async function () {
    const calls: unknown[] = [];
    await connect(
      createFakeClusters({
        prune: async () => {
          calls.push('prune');
          return { removed: ['dead'] };
        },
        logs: async (input) => {
          calls.push(input);
          return [
            {
              host: '127.0.0.1',
              port: 27017,
              type: 'mongod',
              path: '/logs/mongod-1.log',
              lines: ['line one', 'line two'],
            },
          ];
        },
      }),
    );

    const pruneResult = await client.callTool({
      name: 'mongodb_prune_stale_clusters',
      arguments: {},
    });
    expect(pruneResult.structuredContent).to.deep.equal({ removed: ['dead'] });

    const logsResult = await client.callTool({
      name: 'mongodb_cluster_logs',
      arguments: { id: 'a', tailLines: 2 },
    });
    expect(calls).to.deep.equal(['prune', { id: 'a', tailLines: 2 }]);
    expect(logsResult.structuredContent).to.deep.equal({
      logs: [
        {
          host: '127.0.0.1',
          port: 27017,
          type: 'mongod',
          path: '/logs/mongod-1.log',
          lines: ['line one', 'line two'],
        },
      ],
    });
  });
});
