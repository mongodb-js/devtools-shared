import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';
import { expect } from 'chai';
import assert from 'assert';
import type {
  MongoClusterOptions,
  MongoClusterSerializedProperties,
} from '@mongodb-js/mongodb-runner';
import { createClusters, type RunnerApi, type StoredCluster } from './clusters';

type StartOptions = MongoClusterOptions & { id?: string; runnerDir: string };

function storedCluster({
  id,
  topology = 'standalone',
  replSetName,
  startedAt = '2026-01-02T00:00:00.000Z',
  serverUuids = [`${id}-uuid`],
  logDir,
}: {
  id: string;
  topology?: 'standalone' | 'replset' | 'sharded';
  replSetName?: string;
  startedAt?: string;
  serverUuids?: string[];
  logDir?: string;
}): StoredCluster {
  return {
    id,
    connectionString: 'mongodb://127.0.0.1:27017/',
    filepath: `/runner/m-${id}.json`,
    serialized: {
      topology,
      ...(replSetName ? { replSetName } : {}),
      servers: serverUuids.map((uuid, index) => ({
        _id: uuid,
        host: '127.0.0.1',
        port: 27017 + index,
        startTime: startedAt,
        hasInsertedMetadataCollEntry: true,
      })),
      shards: [],
      defaultConnectionOptions: {},
      users: [],
      ...(logDir ? { options: { topology, tmpDir: '/tmp', logDir } } : {}),
    } as MongoClusterSerializedProperties,
  };
}

function createFakeRunner() {
  const started: { options: StartOptions; args?: string[] }[] = [];
  const stopped: { runnerDir: string; id?: string; all?: boolean }[] = [];
  const removed: string[] = [];
  let registry: StoredCluster[] = [];

  const runner: RunnerApi = {
    start: async (options, args) => {
      started.push({ options, args });
      const id = options.id ?? 'generated-id';
      const replSetName =
        options.topology === 'replset' ? 'replSet-test' : undefined;
      registry.push(
        storedCluster({ id, topology: options.topology, replSetName }),
      );
      return {
        cluster: {
          connectionString: `mongodb://127.0.0.1:27017/?replicaSet=${replSetName ?? ''}`,
          serialize: () => ({ topology: options.topology, replSetName }),
        },
        id,
      };
    },
    instances: async function* () {
      yield* registry;
    },
    stop: async (options) => {
      stopped.push(options);
      registry = registry.filter(
        (entry) => !options.all && entry.id !== options.id,
      );
    },
    remove: async (filepath) => {
      removed.push(filepath);
      registry = registry.filter((entry) => entry.filepath !== filepath);
    },
  };

  return {
    runner,
    started,
    stopped,
    removed,
    setRegistry(entries: StoredCluster[]) {
      registry = entries;
    },
  };
}

const runnerDir = '/tmp/runner-dir';

describe('createClusters', function () {
  it('starts a cluster with the generated id and maps the result', async function () {
    const fake = createFakeRunner();
    const clusters = createClusters({ runnerDir, runner: fake.runner });

    const result = await clusters.start({ topology: 'replset' });

    expect(fake.started).to.have.lengthOf(1);
    expect(fake.started[0].options).to.include({
      topology: 'replset',
      runnerDir,
    });
    expect(fake.started[0].options.id).to.be.undefined;
    expect(fake.started[0].options.logDir).to.equal(
      path.join(runnerDir, 'logs'),
    );
    expect(result).to.deep.equal({
      id: 'generated-id',
      connectionString: 'mongodb://127.0.0.1:27017/?replicaSet=replSet-test',
      topology: 'replset',
      replSetName: 'replSet-test',
      logDir: path.join(runnerDir, 'logs'),
    });
  });

  it('passes the id and mongod args separately from the cluster options', async function () {
    const fake = createFakeRunner();
    const clusters = createClusters({ runnerDir, runner: fake.runner });

    await clusters.start({
      topology: 'standalone',
      id: 'my-cluster',
      args: ['--setParameter', 'enableTestCommands=1'],
    });

    expect(fake.started[0].options.id).to.equal('my-cluster');
    expect(fake.started[0].options).to.not.have.property('args');
    expect(fake.started[0].args).to.deep.equal([
      '--setParameter',
      'enableTestCommands=1',
    ]);
  });

  it('lists registry entries sorted by start time', async function () {
    const fake = createFakeRunner();
    fake.setRegistry([
      storedCluster({ id: 'b', startedAt: '2026-01-03T00:00:00.000Z' }),
      storedCluster({
        id: 'a',
        topology: 'replset',
        replSetName: 'repl0',
        startedAt: '2026-01-02T00:00:00.000Z',
      }),
    ]);
    const clusters = createClusters({ runnerDir, runner: fake.runner });

    const result = await clusters.list();

    expect(result).to.deep.equal([
      {
        id: 'a',
        connectionString: 'mongodb://127.0.0.1:27017/',
        topology: 'replset',
        replSetName: 'repl0',
        startedAt: '2026-01-02T00:00:00.000Z',
      },
      {
        id: 'b',
        connectionString: 'mongodb://127.0.0.1:27017/',
        topology: 'standalone',
        startedAt: '2026-01-03T00:00:00.000Z',
      },
    ]);
  });

  it('stops a single cluster by id', async function () {
    const fake = createFakeRunner();
    fake.setRegistry([storedCluster({ id: 'a' })]);
    const clusters = createClusters({ runnerDir, runner: fake.runner });

    const result = await clusters.stop({ id: 'a' });

    expect(result).to.deep.equal({ stopped: ['a'] });
    expect(fake.stopped).to.deep.equal([{ runnerDir, id: 'a' }]);
  });

  it('rejects an unknown cluster id', async function () {
    const fake = createFakeRunner();
    const clusters = createClusters({ runnerDir, runner: fake.runner });

    await assert.rejects(
      clusters.stop({ id: 'missing' }),
      /No running cluster with id "missing"/,
    );
    expect(fake.stopped).to.be.empty;
  });

  it('stops every cluster when all is set', async function () {
    const fake = createFakeRunner();
    fake.setRegistry([storedCluster({ id: 'a' }), storedCluster({ id: 'b' })]);
    const clusters = createClusters({ runnerDir, runner: fake.runner });

    const result = await clusters.stop({ all: true });

    expect(result).to.deep.equal({ stopped: ['a', 'b'] });
    expect(fake.stopped).to.deep.equal([{ runnerDir, all: true }]);
  });

  it('requires exactly one of id and all', async function () {
    const fake = createFakeRunner();
    const clusters = createClusters({ runnerDir, runner: fake.runner });

    await assert.rejects(
      clusters.stop({}),
      /Either "id" or "all: true" is required/,
    );
    await assert.rejects(
      clusters.stop({ id: 'a', all: true }),
      /"id" and "all" cannot be combined/,
    );
  });

  it('reports cluster details when the cluster is reachable', async function () {
    const fake = createFakeRunner();
    fake.setRegistry([
      storedCluster({
        id: 'a',
        topology: 'replset',
        replSetName: 'repl0',
        logDir: '/logs',
      }),
    ]);
    const clusters = createClusters({
      runnerDir,
      runner: fake.runner,
      inspect: async () => ({ version: '8.2.1', variant: 'community' }),
    });

    const result = await clusters.get({ id: 'a' });

    expect(result).to.include({
      id: 'a',
      topology: 'replset',
      replSetName: 'repl0',
      running: true,
      version: '8.2.1',
      variant: 'community',
      logDir: '/logs',
    });
    expect(result.servers).to.deep.equal([
      { host: '127.0.0.1', port: 27017, type: 'mongod' },
    ]);
  });

  it('reports a stale registry entry as not running', async function () {
    const fake = createFakeRunner();
    fake.setRegistry([storedCluster({ id: 'a' })]);
    const clusters = createClusters({
      runnerDir,
      runner: fake.runner,
      inspect: async () => {
        throw new Error('connect ECONNREFUSED 127.0.0.1:27017');
      },
    });

    const result = await clusters.get({ id: 'a' });

    expect(result.running).to.be.false;
    expect(result.error).to.match(/ECONNREFUSED/);
  });

  it('prunes only the clusters that are not reachable', async function () {
    const fake = createFakeRunner();
    fake.setRegistry([
      storedCluster({ id: 'alive' }),
      storedCluster({ id: 'dead' }),
    ]);
    const clusters = createClusters({
      runnerDir,
      runner: fake.runner,
      inspect: async (serialized) => {
        if (serialized.servers[0]._id === 'dead-uuid') {
          throw new Error('connect ECONNREFUSED');
        }
        return { version: '8.2.1', variant: 'community' };
      },
    });

    const result = await clusters.prune();

    expect(result).to.deep.equal({ removed: ['dead'] });
    expect(fake.removed).to.deep.equal(['/runner/m-dead.json']);
  });

  it('reads the tail of every server log', async function () {
    const logDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-logs-'));
    const logFile = path.join(
      logDir,
      'mongod-uuid-a-2026-01-02T000000000Z.log',
    );
    await fs.writeFile(logFile, 'first\nsecond\nthird\n');

    try {
      const fake = createFakeRunner();
      fake.setRegistry([
        storedCluster({ id: 'a', serverUuids: ['uuid-a'], logDir }),
      ]);
      const clusters = createClusters({ runnerDir, runner: fake.runner });

      const logs = await clusters.logs({ id: 'a', tailLines: 2 });

      expect(logs).to.deep.equal([
        {
          host: '127.0.0.1',
          port: 27017,
          type: 'mongod',
          path: logFile,
          lines: ['second', 'third'],
        },
      ]);
    } finally {
      await fs.rm(logDir, { recursive: true, force: true });
    }
  });
});
