import { expect } from 'chai';
import { MongoCluster } from './mongocluster';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import createDebug from 'debug';

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

  it('can spawn a 6.x standalone mongod on a pre-specified port', async function () {
    cluster = await MongoCluster.start({
      version: '6.x',
      topology: 'standalone',
      tmpDir,
      args: ['--port', '50079'],
    });
    expect(cluster.connectionString).to.include(`:50079`);
  });

  it('can spawn a 6.x replset', async function () {
    cluster = await MongoCluster.start({
      version: '6.x',
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

  it('can spawn a 6.x replset with specific number of arbiters and secondaries', async function () {
    cluster = await MongoCluster.start({
      version: '6.x',
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
    expect(+hello.passives.length + +hello.hosts.length).to.equal(5);
  });

  it('can spawn a 6.x sharded cluster', async function () {
    const logDir = path.join(tmpDir, `sharded-logs`);
    cluster = await MongoCluster.start({
      version: '6.x',
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
      logFiles.filter((file) => file.startsWith('mongod-')).length
    ).to.be.greaterThan(2);
    expect(
      logFiles.filter((file) => file.startsWith('mongos-')).length
    ).to.equal(1);
  });

  it('can spawn a 6.x standalone mongod with TLS enabled and get build info', async function () {
    cluster = await MongoCluster.start({
      version: '6.x',
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
    if (process.platform === 'win32' && process.env.CI) {
      return this.skip(); // Github Actions CI runners go OOM when extracting the 6.x enterprise tarball...
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

  it('can serialize and deserialize sharded cluster info', async function () {
    cluster = await MongoCluster.start({
      version: '6.x',
      topology: 'sharded',
      tmpDir,
      secondaries: 0,
    });
    cluster = await MongoCluster.deserialize(cluster.serialize());
    const { ok } = await cluster.withClient(async (client) => {
      return await client.db('admin').command({ ping: 1 });
    });
    expect(ok).to.equal(1);
    await cluster.close();
  });
});
