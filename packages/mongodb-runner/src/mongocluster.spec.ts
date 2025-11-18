import { expect } from 'chai';
import { MongoCluster } from './mongocluster';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import createDebug from 'debug';
import sinon from 'sinon';
import type { LogEntry } from './mongologreader';

if (process.env.CI) {
  createDebug.enable('mongodb-runner,mongodb-downloader');
}

const twoIfNotWindowsCI =
  process.platform === 'win32' && process.env.CI ? 0 : 2;

// These are from the testing/certificates directory of mongosh
const SERVER_KEY = 'server.bundle.pem';
const CA_CERT = 'ca.crt';

describe('MongoCluster', function () {
  this.timeout(1_000_000); // Downloading Windows binaries can take a very long time...

  let tmpDir: string;
  let cluster: MongoCluster;

  before(async function () {
    tmpDir = path.join(os.tmpdir(), `runner-tests-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });
  });

  after(async function () {
    await fs.rm(tmpDir, {
      recursive: true,
      maxRetries: 100,
    });
  });

  afterEach(async function () {
    await cluster?.close();
    sinon.restore();
  });

  it('can use custom downloadDir option for binary downloads', async function () {
    const customDownloadDir = path.join(tmpDir, 'custom-downloads');

    sinon
      .stub(MongoCluster, 'downloadMongoDb' as any)
      .resolves(customDownloadDir);

    try {
      cluster = await MongoCluster.start({
        version: '8.x',
        topology: 'standalone',
        tmpDir,
        downloadDir: customDownloadDir,
        downloadOptions: {
          platform: 'linux',
          arch: 'x64',
        },
      });
    } catch (err) {
      // This will error because no actual binary gets downloaded
    }

    expect(MongoCluster['downloadMongoDb']).to.have.been.calledWith(
      customDownloadDir,
      '8.x',
      {
        platform: 'linux',
        arch: 'x64',
      },
    );
  });

  it('can spawn a 6.x standalone mongod', async function () {
    cluster = await MongoCluster.start({
      version: '6.x',
      topology: 'standalone',
      tmpDir,
    });
    expect(cluster.connectionString).to.be.a('string');
    expect(cluster.serverVersion).to.match(/^6\./);
    expect(cluster.serverVariant).to.equal('community');
    const { ok } = await cluster.withClient(async (client) => {
      return await client.db('admin').command({ ping: 1 });
    });
    expect(ok).to.equal(1);
  });

  it('can spawn a 8.x standalone mongod', async function () {
    cluster = await MongoCluster.start({
      version: '8.x',
      topology: 'standalone',
      tmpDir,
    });
    expect(cluster.connectionString).to.be.a('string');
    expect(cluster.serverVersion).to.match(/^6\./);
    expect(cluster.serverVariant).to.equal('community');
    const { ok } = await cluster.withClient(async (client) => {
      return await client.db('admin').command({ ping: 1 });
    });
    expect(ok).to.equal(1);
  });

  it('can spawn a 8.x standalone mongod on a pre-specified port', async function () {
    cluster = await MongoCluster.start({
      version: '8.x',
      topology: 'standalone',
      tmpDir,
      args: ['--port', '50079'],
    });
    expect(cluster.connectionString).to.include(`:50079`);
  });

  it('can spawn a 8.x replset', async function () {
    cluster = await MongoCluster.start({
      version: '8.x',
      topology: 'replset',
      tmpDir,
    });
    expect(cluster.connectionString).to.be.a('string');
    expect(cluster.serverVersion).to.match(/^6\./);
    const hello = await cluster.withClient(async (client) => {
      return await client.db('admin').command({ hello: 1 });
    });
    expect(+hello.passives.length + +hello.hosts.length).to.equal(3);
  });

  it('can spawn a 8.x replset with specific number of arbiters and secondaries', async function () {
    cluster = await MongoCluster.start({
      version: '8.x',
      topology: 'replset',
      tmpDir,
      secondaries: 3,
      arbiters: 1,
    });
    expect(cluster.connectionString).to.be.a('string');
    expect(cluster.serverVersion).to.match(/^6\./);
    const hello = await cluster.withClient(async (client) => {
      return await client.db('admin').command({ hello: 1 });
    });
    expect(hello.hosts).to.have.lengthOf(1);
    expect(hello.passives).to.have.lengthOf(3);
    expect(hello.arbiters).to.have.lengthOf(1);
  });

  it('can spawn a 8.x sharded cluster', async function () {
    const logDir = path.join(tmpDir, `sharded-logs`);
    cluster = await MongoCluster.start({
      version: '8.x',
      topology: 'sharded',
      tmpDir,
      shards: 2,
      secondaries: twoIfNotWindowsCI,
      logDir,
    });
    expect(cluster.connectionString).to.be.a('string');
    expect(cluster.serverVersion).to.match(/^6\./);
    const hello = await cluster.withClient(async (client) => {
      return await client.db('admin').command({ hello: 1 });
    });
    expect(hello.msg).to.equal('isdbgrid');

    const logFiles = await fs.readdir(logDir);
    expect(
      logFiles.filter((file) => file.startsWith('mongod-')).length,
    ).to.be.greaterThan(2);
    expect(
      logFiles.filter((file) => file.startsWith('mongos-')).length,
    ).to.equal(1);
  });

  it('can spawn a 8.x standalone mongod with TLS enabled and get build info', async function () {
    cluster = await MongoCluster.start({
      version: '8.x',
      topology: 'standalone',
      tmpDir,
      args: [
        '--tlsMode',
        'requireTLS',
        '--tlsCertificateKeyFile',
        path.resolve(__dirname, '..', 'test', 'fixtures', SERVER_KEY),
        '--tlsCAFile',
        path.resolve(__dirname, '..', 'test', 'fixtures', CA_CERT),
      ],
    });
    expect(cluster.connectionString).to.be.a('string');
    expect(cluster.serverVersion).to.match(/^6\./);
    expect(cluster.serverVariant).to.equal('community');
  });

  context('on Linux', function () {
    before(function () {
      if (process.platform !== 'linux') return this.skip(); // No docker
    });

    // This is the easiest way to ensure that MongoServer can handle the
    // pre-4.4 log format (because in the devtools-shared CI, we only
    // test ubuntu-latest).
    it('can spawn a 4.0.x replset using docker', async function () {
      cluster = await MongoCluster.start({
        version: '4.0.x',
        topology: 'replset',
        tmpDir,
        docker: 'mongo:4.0',
        downloadOptions: {
          distro: 'ubuntu1604',
        },
      });
      expect(cluster.connectionString).to.be.a('string');
      expect(cluster.serverVersion).to.match(/^4\./);
      const hello = await cluster.withClient(async (client) => {
        return await client.db('admin').command({ hello: 1 });
      });
      expect(+hello.passives.length + +hello.hosts.length).to.equal(3);
    });

    it('can spawn a 4.0.x sharded env using docker', async function () {
      cluster = await MongoCluster.start({
        version: '4.0.x',
        topology: 'sharded',
        tmpDir,
        docker: 'mongo:4.0',
        shards: 1,
        secondaries: 0,
        downloadOptions: {
          distro: 'ubuntu1604',
        },
      });
      expect(cluster.connectionString).to.be.a('string');
      expect(cluster.serverVersion).to.match(/^4\./);
      const hello = await cluster.withClient(async (client) => {
        return await client.db('admin').command({ hello: 1 });
      });
      expect(hello.msg).to.equal('isdbgrid');
    });

    it('can spawn a 4.0.x standalone mongod with TLS enabled and get build info', async function () {
      cluster = await MongoCluster.start({
        version: '4.0.x',
        topology: 'standalone',
        tmpDir,
        args: [
          '--sslMode',
          'requireSSL',
          '--sslPEMKeyFile',
          `/projectroot/test/fixtures/${SERVER_KEY}`,
          '--sslCAFile',
          `/projectroot/test/fixtures/${CA_CERT}`,
        ],
        docker: [
          `--volume=${path.resolve(__dirname, '..')}:/projectroot:ro`,
          'mongo:4.0',
        ],
        downloadOptions: {
          distro: 'ubuntu1604',
        },
      });
      expect(cluster.connectionString).to.be.a('string');
      expect(cluster.serverVersion).to.match(/^4\./);
      expect(cluster.serverVariant).to.equal('community');
    });
  });

  it('can spawn a 6.x enterprise standalone mongod', async function () {
    if (
      (process.platform === 'win32' || process.platform === 'linux') &&
      process.env.CI
    ) {
      // Github Actions CI runners go OOM on Windows when extracting the 6.x enterprise tarball...
      // On Ubuntu, 6.x only supports up to 22.04, while CI runs on 24.04.
      return this.skip();
    }

    cluster = await MongoCluster.start({
      version: '6.x-enterprise',
      topology: 'standalone',
      tmpDir,
    });
    expect(cluster.connectionString).to.be.a('string');
    expect(cluster.serverVersion).to.match(/^6\./);
    expect(cluster.serverVariant).to.equal('enterprise');
    const { ok } = await cluster.withClient(async (client) => {
      return await client.db('admin').command({ ping: 1 });
    });
    expect(ok).to.equal(1);
  });

  it('can spawn a 8.x enterprise standalone mongod', async function () {
    cluster = await MongoCluster.start({
      version: '8.x-enterprise',
      topology: 'standalone',
      tmpDir,
    });
    expect(cluster.connectionString).to.be.a('string');
    expect(cluster.serverVersion).to.match(/^8\./);
    expect(cluster.serverVariant).to.equal('enterprise');
    const { ok } = await cluster.withClient(async (client) => {
      return await client.db('admin').command({ ping: 1 });
    });
    expect(ok).to.equal(1);
  });

  it('can serialize and deserialize sharded cluster info', async function () {
    cluster = await MongoCluster.start({
      version: '8.x',
      topology: 'sharded',
      tmpDir,
      secondaries: 0,
    });
    cluster = await MongoCluster.deserialize(cluster.serialize());
    const doc = await cluster.withClient(async (client) => {
      return await client.db('config').collection('mongodbrunner').findOne();
    });
    expect(doc?._id).to.be.a('string');
    await cluster.close();
  });

  it('can let callers listen for server log events', async function () {
    cluster = await MongoCluster.start({
      version: '8.x',
      topology: 'replset',
      tmpDir,
      secondaries: 1,
    });
    const logs: LogEntry[] = [];
    cluster.on('mongoLog', (uuid, entry) => logs.push(entry));
    await cluster.withClient(async (client) => {
      const coll = await client.db('test').createCollection<any>('test', {
        validationAction: 'warn',
        validationLevel: 'strict',
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['phone'],
            properties: {
              phone: {
                bsonType: 'string',
              },
            },
          },
        },
      });
      await coll.insertOne({ _id: 42, baddoc: 1 });
    });
    expect(
      logs.find(
        (entry) =>
          entry.id === 20320 /* create collection */ &&
          entry.attr.namespace === 'test.test',
      ),
    ).to.exist;
    const validatorLogEntry = logs.find(
      (entry) => entry.id === 20294 /* fail validation */,
    );
    expect(validatorLogEntry?.attr.namespace).to.equal('test.test');
    expect(validatorLogEntry?.attr.document).to.deep.equal({
      _id: 42,
      baddoc: 1,
    });
  });

  it('can pass custom arguments for replica set members', async function () {
    cluster = await MongoCluster.start({
      version: '8.x',
      topology: 'replset',
      tmpDir,
      rsMembers: [
        { args: ['--setParameter', 'cursorTimeoutMillis=60000'] },
        { args: ['--setParameter', 'cursorTimeoutMillis=50000'] },
      ],
    });

    expect(cluster.connectionString).to.be.a('string');
    expect(cluster.serverVersion).to.match(/^6\./);
    const hello = await cluster.withClient(async (client) => {
      return await client.db('admin').command({ hello: 1 });
    });
    expect(hello.hosts).to.have.lengthOf(1);
    expect(hello.passives).to.have.lengthOf(1);

    const servers = cluster['servers'];
    expect(servers).to.have.lengthOf(2);
    const values = await Promise.all(
      servers.map((srv) =>
        srv.withClient(async (client) => {
          return await Promise.all([
            client
              .db('admin')
              .command({ getParameter: 1, cursorTimeoutMillis: 1 }),
            client.db('admin').command({ hello: 1 }),
          ]);
        }),
      ),
    );

    expect(
      values.map((v) => [v[0].cursorTimeoutMillis, v[1].isWritablePrimary]),
    ).to.deep.equal([
      [60000, true],
      [50000, false],
    ]);
  });

  it('can pass custom arguments for shards', async function () {
    cluster = await MongoCluster.start({
      version: '8.x',
      topology: 'sharded',
      tmpDir,
      secondaries: 0,
      shardArgs: [
        ['--setParameter', 'cursorTimeoutMillis=60000'],
        ['--setParameter', 'cursorTimeoutMillis=50000'],
      ],
    });

    expect(cluster.connectionString).to.be.a('string');
    expect(cluster.serverVersion).to.match(/^6\./);

    const shards = cluster['shards'];
    expect(shards).to.have.lengthOf(2);
    const values = await Promise.all(
      shards.map((srv) =>
        srv.withClient(async (client) => {
          return await Promise.all([
            client
              .db('admin')
              .command({ getParameter: 1, cursorTimeoutMillis: 1 }),
            client.db('admin').command({ hello: 1 }),
          ]);
        }),
      ),
    );

    expect(
      values.map((v) => [
        v[0].cursorTimeoutMillis,
        v[1].setName === values[0][1].setName,
      ]),
    ).to.deep.equal([
      [60000, true],
      [50000, false],
    ]);
  });

  it('can pass custom arguments for mongoses', async function () {
    cluster = await MongoCluster.start({
      version: '8.x',
      topology: 'sharded',
      tmpDir,
      secondaries: 0,
      mongosArgs: [
        ['--setParameter', 'cursorTimeoutMillis=60000'],
        ['--setParameter', 'cursorTimeoutMillis=50000'],
      ],
    });

    expect(cluster.connectionString).to.be.a('string');
    expect(cluster.serverVersion).to.match(/^6\./);

    const mongoses = cluster['servers'];
    expect(mongoses).to.have.lengthOf(2);
    const values = await Promise.all(
      mongoses.map((srv, i) =>
        srv.withClient(async (client) => {
          return await Promise.all([
            client
              .db('admin')
              .command({ getParameter: 1, cursorTimeoutMillis: 1 }),
            client.db('admin').command({ hello: 1 }),
            // Ensure that the mongos announces itself to the cluster
            client.db('test').collection(`test${i}`).insertOne({ dummy: 1 }),
          ]);
        }),
      ),
    );

    const processIdForMongos = (v: any) =>
      v[1].topologyVersion.processId.toHexString();
    expect(
      values.map((v) => [
        v[0].cursorTimeoutMillis,
        v[1].msg,
        processIdForMongos(v) === processIdForMongos(values[0]),
      ]),
    ).to.deep.equal([
      [60000, 'isdbgrid', true],
      [50000, 'isdbgrid', false],
    ]);

    const mongosList = await cluster.withClient(
      async (client) =>
        await client.db('config').collection('mongos').find().toArray(),
    );
    expect(mongosList).to.have.lengthOf(2);
  });

  it('can add authentication options and verify them after serialization', async function () {
    cluster = await MongoCluster.start({
      version: '8.x',
      topology: 'sharded',
      tmpDir,
      secondaries: 1,
      shards: 1,
      users: [
        {
          username: 'testuser',
          password: 'testpass',
          roles: [{ role: 'readWriteAnyDatabase', db: 'admin' }],
        },
      ],
      mongosArgs: [[], []],
    });
    expect(cluster.connectionString).to.be.a('string');
    expect(cluster.serverVersion).to.match(/^6\./);
    expect(cluster.connectionString).to.include('testuser:testpass@');
    await cluster.withClient(async (client) => {
      const result = await client
        .db('test')
        .collection('test')
        .insertOne({ foo: 42 });
      expect(result.insertedId).to.exist;
    });

    cluster = await MongoCluster.deserialize(cluster.serialize());
    expect(cluster.connectionString).to.include('testuser:testpass@');
    const [doc, status] = await cluster.withClient(async (client) => {
      return Promise.all([
        client.db('test').collection('test').findOne({ foo: 42 }),
        client.db('admin').command({ connectionStatus: 1 }),
      ] as const);
    });
    expect(doc?.foo).to.equal(42);
    expect(status.authInfo.authenticatedUsers).to.deep.equal([
      { user: 'testuser', db: 'admin' },
    ]);
  });
});
