import { expect } from 'chai';
import {
  findPrimary,
  MongoCluster,
  redactSerializedCluster,
  type RSMemberOptions,
  type SerializedClusterProperties,
} from './mongocluster';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import createDebug from 'debug';
import sinon from 'sinon';
import childProcess from 'child_process';
import type { LogEntry } from './mongologreader';
import { MongoClient, MongoServerError } from 'mongodb';
import type { MongoClientOptions } from 'mongodb';
import { eventually } from './util';

if (process.env.CI) {
  createDebug.enable('mongodb-runner,mongodb-downloader');
}

const twoIfNotWindowsCI =
  process.platform === 'win32' && process.env.CI ? 0 : 2;

// These are from the testing/certificates directory of mongosh
const SERVER_KEY = 'server.bundle.pem';
const CA_CERT = 'ca.crt';
const SHORT_TIMEOUTS: Partial<MongoClientOptions> = {
  serverSelectionTimeoutMS: 500,
  connectTimeoutMS: 500,
  socketTimeoutMS: 500,
  timeoutMS: 500,
};

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

  describe('findPrimary', function () {
    it('selects the highest-priority member', function () {
      const members: RSMemberOptions[] = [
        { priority: 0 },
        { priority: 2 },
        { priority: 1 },
      ];
      expect(findPrimary(members)).to.equal(members[1]);
    });

    it('selects the first member on a priority tie', function () {
      const members: RSMemberOptions[] = [{ priority: 1 }, { priority: 1 }];
      expect(findPrimary(members)).to.equal(members[0]);
    });

    it('prefers an unset priority over an explicit zero on a tie', function () {
      // Otherwise replSetInitiate would default every member's priority to 0
      // and the replica set would have no electable member.
      const members: RSMemberOptions[] = [{ priority: 0 }, {}];
      expect(findPrimary(members)).to.equal(members[1]);
    });

    it('prefers a higher explicit priority over an unset one', function () {
      const members: RSMemberOptions[] = [{}, { priority: 5 }];
      expect(findPrimary(members)).to.equal(members[1]);
    });

    it('values explicitly set priorities over unset ones', function () {
      const members: RSMemberOptions[] = [
        {},
        { priority: -1 }, // explicit, but lower than the implicit 0
        { priority: 5 },
      ];
      expect(findPrimary(members)).to.equal(members[2]);
    });

    it('selects the first member when no priority is set', function () {
      const members: RSMemberOptions[] = [{}, {}, {}];
      expect(findPrimary(members)).to.equal(members[0]);
    });

    it('returns undefined for an empty member list', function () {
      expect(findPrimary([])).to.equal(undefined);
    });
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

  it('releases storage port reservations when startup fails before compose', async function () {
    // Fail during binary download, i.e. after the caller created the SLS
    // options (and reserved its ports) but before `docker compose up` runs.
    sinon
      .stub(MongoCluster, 'downloadMongoDb' as any)
      .rejects(new Error('stub: download failed'));

    let released = 0;
    const err = await MongoCluster.start({
      version: '8.x',
      topology: 'standalone',
      tmpDir,
      disaggregatedStorage: {
        composeFile: path.join(tmpDir, 'unused-compose.yml'),
        config: '{}',
        beforeComposeUp: () => {
          released++;
        },
      },
    }).then(
      () => undefined,
      (e) => e as Error,
    );

    expect(err?.message).to.equal('stub: download failed');
    expect(released).to.equal(
      1,
      'port reservations should be released when startup fails before compose',
    );
  });

  it('forwards the detached option to the spawned server process', async function () {
    // Stub spawn so we assert the option is plumbed through without actually
    // starting a server. binDir is set so no binary download is attempted.
    const spawnStub = sinon
      .stub(childProcess, 'spawn')
      .throws(new Error('stub: not actually spawning a server'));
    const binDir = path.join(tmpDir, 'unused-bin');

    for (const { detached, expected } of [
      { detached: undefined, expected: true }, // default preserves CLI behavior
      { detached: false, expected: false },
      { detached: true, expected: true },
    ]) {
      spawnStub.resetHistory();
      try {
        await MongoCluster.start({
          topology: 'standalone',
          tmpDir,
          binDir,
          ...(detached === undefined ? {} : { detached }),
        });
        expect.fail('expected start to throw because spawn is stubbed');
      } catch (err) {
        if (
          !String((err as Error).message).includes(
            'stub: not actually spawning',
          )
        ) {
          throw err;
        }
      }
      expect(spawnStub).to.have.been.calledOnce;
      expect(spawnStub.firstCall.args[2]).to.include({ detached: expected });
    }
  });

  it('can spawn a 6.x standalone mongod', async function () {
    cluster = await MongoCluster.start({
      version: '6.x',
      topology: 'standalone',
      tmpDir,
    });
    expect(cluster.connectionString).to.be.a('string');
    expect(cluster.connectionString).to.include('127.0.0.1');
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
    expect(cluster.serverVersion).to.match(/^8\./);
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
    expect(cluster.serverVersion).to.match(/^8\./);
    const hello = await cluster.withClient(async (client) => {
      return await client.db('admin').command({ hello: 1 });
    });
    expect(+hello.passives.length + +hello.hosts.length).to.equal(3);
  });

  it('can spawn a 8.x replset with a pre-specified port for the primary', async function () {
    cluster = await MongoCluster.start({
      version: '8.x',
      topology: 'replset',
      tmpDir,
      args: ['--port', '50080'],
    });
    expect(cluster.connectionString).to.include(`:50080`);
    const hello = await cluster.withClient(async (client) => {
      return await client.db('admin').command({ hello: 1 });
    });
    expect(+hello.passives.length + +hello.hosts.length).to.equal(3);
  });

  it('can spawn a 8.x replset with a pre-specified --port= for the primary', async function () {
    cluster = await MongoCluster.start({
      version: '8.x',
      topology: 'replset',
      tmpDir,
      args: ['--port=50081'],
    });
    expect(cluster.connectionString).to.include(`:50081`);
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
    expect(cluster.serverVersion).to.match(/^8\./);
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
    expect(cluster.serverVersion).to.match(/^8\./);
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

  it('can use localhost as the host', async function () {
    cluster = await MongoCluster.start({
      host: 'localhost',
      topology: 'standalone',
      tmpDir,
    });
    expect(cluster.connectionString).to.be.a('string');
    expect(cluster.connectionString).to.include('localhost');
    cluster = await MongoCluster.deserialize(cluster.serialize());
    expect(cluster.connectionString).to.include('localhost');
  });

  it('can start a sharded cluster with a config shard', async function () {
    cluster = await MongoCluster.start({
      version: '8.x',
      topology: 'sharded',
      tmpDir,
      shards: 1,
      secondaries: twoIfNotWindowsCI,
      configShard: true,
    });
    const listShards = await cluster.withClient((client) =>
      client.db('admin').command({ listShards: 1 }),
    );
    const shardIds = listShards.shards.map((s: any) => s._id);
    expect(
      shardIds,
      'the config server should be listed as a shard',
    ).to.include('config');
    expect(shardIds).to.have.lengthOf(2);

    const serialized = cluster.serialize();
    expect(serialized.configShard).to.be.true;
    const roundTripped = await MongoCluster.deserialize(serialized);
    expect(
      roundTripped.serialize().configShard,
      'the config shard flag should survive a serialize round trip',
    ).to.be.true;
  });

  it('can start a sharded cluster with a config shard and keyfile auth', async function () {
    const keyFile = path.join(tmpDir, 'keyFileConfigShard');
    await fs.writeFile(keyFile, 'csauthsecret', { mode: 0o400 });
    cluster = await MongoCluster.start({
      version: '8.x',
      topology: 'sharded',
      tmpDir,
      shards: 1,
      secondaries: 0,
      users: [
        {
          username: 'testuser',
          password: 'testpass',
          roles: ['root'],
        },
      ],
      args: ['--keyFile', keyFile],
      configShard: true,
    });
    const listShards = await cluster.withClient((client) =>
      client.db('admin').command({ listShards: 1 }),
    );
    expect(
      listShards.shards.map((s: any) => s._id),
      'the config server should be listed as a shard',
    ).to.include('config');

    // The temporary user created for the transition must have been removed.
    const usersInfo = await cluster.withClient((client) =>
      client.db('admin').command({ usersInfo: 1 }),
    );
    expect(
      usersInfo.users.map((u: any) => u.user),
      'the temporary transition user should be gone',
    ).to.deep.equal(['testuser']);
  });

  it('rejects configShard with authentication but no configured users', async function () {
    const keyFile = path.join(tmpDir, 'keyFileConfigShardNoUsers');
    await fs.writeFile(keyFile, 'csauthsecret', { mode: 0o400 });
    let err: unknown;
    try {
      await MongoCluster.start({
        version: '8.x',
        topology: 'sharded',
        tmpDir,
        shards: 1,
        secondaries: 0,
        args: ['--keyFile', keyFile],
        configShard: true,
      });
    } catch (e) {
      err = e;
    }
    expect(err, 'start should have failed').to.be.instanceOf(Error);
    expect((err as Error).message).to.include(
      'configShard requires at least one user',
    );
  });

  it('rejects configShard for non-sharded topologies', async function () {
    let err: unknown;
    try {
      await MongoCluster.start({
        topology: 'replset',
        tmpDir,
        configShard: true,
      });
    } catch (e) {
      err = e;
    }
    expect(err, 'start should have failed').to.be.instanceOf(Error);
    expect((err as Error).message).to.include(
      'configShard requires the sharded topology',
    );
  });

  it('can use localhost as the host for a sharded cluster', async function () {
    cluster = await MongoCluster.start({
      host: 'localhost',
      version: '8.x',
      topology: 'sharded',
      tmpDir,
      shards: 1,
      secondaries: twoIfNotWindowsCI,
    });
    expect(cluster.connectionString).to.include('localhost');

    // Every server, including the config server replica set members, must
    // advertise the requested host.
    const serialized = cluster.serialize();
    for (const server of serialized.servers) {
      expect(server.host).to.equal('localhost');
    }
    for (const shard of serialized.shards) {
      for (const server of shard.servers) {
        expect(server.host).to.equal('localhost');
      }
    }

    // The cluster must actually work: addShard must have succeeded with
    // localhost hosts, and mongos (which connects to the config server
    // replset through its advertised hosts) must route writes.
    await cluster.withClient(async (client) => {
      await client.db('test-sharded-localhost').collection('c').insertOne({});
      const hello = await client.db('admin').command({ hello: 1 });
      expect(hello.msg).to.equal('isdbgrid');
      const { shards } = await client.db('admin').command({ listShards: 1 });
      expect(shards).to.have.lengthOf(1);
      expect(shards[0].host).to.include('localhost');
    });
  });

  context('TLS', function () {
    it('can spawn a 8.x standalone mongod with TLS enabled and get build info (automatically added client key)', async function () {
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
      expect(cluster.connectionString).to.include(
        'tls=true&tlsCertificateKeyFile=',
      );
      expect(cluster.serverVersion).to.match(/^8\./);
      expect(cluster.serverVariant).to.equal('community');

      await cluster.withClient(async (client) => {
        expect(
          path.basename(client.options.tlsCertificateKeyFile ?? ''),
        ).to.include('mongodb-runner-client-');
        const buildInfo = await client.db('admin').command({ buildInfo: 1 });
        expect(buildInfo.version).to.be.a('string');
      });
    });

    it('can spawn a 8.x standalone mongod with TLS enabled and get build info (no extra client key)', async function () {
      cluster = await MongoCluster.start({
        version: '8.x',
        topology: 'standalone',
        tmpDir,
        tlsAddClientKey: false,
        internalClientOptions: { ...SHORT_TIMEOUTS },
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
      expect(cluster.connectionString).not.to.include('tls=');
      expect(cluster.connectionString).not.to.include('tlsCertificateKeyFile=');
      expect(cluster.serverVersion).to.match(/^8\./);
      expect(cluster.serverVariant).to.equal('community');

      try {
        await cluster.withClient(() => {}, { ...SHORT_TIMEOUTS });
        expect.fail('missed exception');
      } catch (err: any) {
        expect(err.name).to.equal('MongoServerSelectionError');
      }
    });

    it('can spawn a 8.x standalone mongod with TLS enabled and get build info (explicit client cert)', async function () {
      cluster = await MongoCluster.start({
        version: '8.x',
        topology: 'standalone',
        tmpDir,
        internalClientOptions: {
          tls: true,
          tlsCAFile: path.resolve(__dirname, '..', 'test', 'fixtures', CA_CERT),
          tlsCertificateKeyFile: path.resolve(
            __dirname,
            '..',
            'test',
            'fixtures',
            SERVER_KEY,
          ),
          tlsAllowInvalidCertificates: true,
        },
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
      expect(cluster.connectionString).to.include('tls=true&tlsCAFile=');
      expect(cluster.connectionString).to.include('tlsCertificateKeyFile=');
      expect(cluster.serverVersion).to.match(/^8\./);
      expect(cluster.serverVariant).to.equal('community');

      await cluster.withClient(async (client) => {
        expect(
          path.basename(client.options.tlsCertificateKeyFile ?? ''),
        ).to.equal(SERVER_KEY);
        const buildInfo = await client.db('admin').command({ buildInfo: 1 });
        expect(buildInfo.version).to.be.a('string');
      });
    });
  });

  context('on Linux', function () {
    before(function () {
      if (process.platform !== 'linux') return this.skip(); // No docker
    });

    // These exercise the docker code path across server generations. 4.2 is
    // included because it is the easiest way to ensure that MongoServer can
    // handle the pre-4.4 log format (in the devtools-shared CI, we only test
    // ubuntu-latest otherwise). It also requires the legacy TLS arguments.
    const dockerVersions = [
      {
        version: '4.2.x',
        docker: 'mongo:4.2',
        replsetDistro: 'ubuntu1804',
        otherDistro: 'ubuntu1604',
        tlsArgs: [
          '--sslMode',
          'requireSSL',
          '--sslPEMKeyFile',
          `/projectroot/test/fixtures/${SERVER_KEY}`,
          '--sslCAFile',
          `/projectroot/test/fixtures/${CA_CERT}`,
        ],
      },
      {
        version: '8.0.x',
        docker: 'mongo:8.0',
        replsetDistro: 'ubuntu2404',
        otherDistro: 'ubuntu2404',
        tlsArgs: [
          '--tlsMode',
          'requireTLS',
          '--tlsCertificateKeyFile',
          `/projectroot/test/fixtures/${SERVER_KEY}`,
          '--tlsCAFile',
          `/projectroot/test/fixtures/${CA_CERT}`,
        ],
      },
      {
        version: '9.0.x',
        docker: 'mongo:9.0',
        replsetDistro: 'ubuntu2404',
        otherDistro: 'ubuntu2404',
        tlsArgs: [
          '--tlsMode',
          'requireTLS',
          '--tlsCertificateKeyFile',
          `/projectroot/test/fixtures/${SERVER_KEY}`,
          '--tlsCAFile',
          `/projectroot/test/fixtures/${CA_CERT}`,
        ],
      },
    ];

    // TODO(SERVER-131779): mongod 8.0.x up to 8.0.34 refuses to start on
    // Ubuntu's 7.0.0-x kernels (now used by GitHub's ubuntu-latest runners)
    // because its kernel version check ignores Ubuntu's patch level. The fix
    // ships in 8.0.35 (BACKPORT-29796); remove this skip once it is out.
    const startOrSkip = async (
      ctx: Mocha.Context,
      options: Parameters<typeof MongoCluster.start>[0],
    ): Promise<MongoCluster> => {
      try {
        return await MongoCluster.start(options);
      } catch (err) {
        if (
          /Linux kernel versions 6\.19 and newer has a known incompatibility/.test(
            (err as Error).message,
          )
        ) {
          ctx.skip();
        }
        throw err;
      }
    };

    for (const {
      version,
      docker,
      replsetDistro,
      otherDistro,
      tlsArgs,
    } of dockerVersions) {
      const serverVersion = new RegExp(`^${version.split('.')[0]}\\.`);

      it(`can spawn a ${version} replset using docker`, async function () {
        cluster = await startOrSkip(this, {
          version,
          topology: 'replset',
          tmpDir,
          docker,
          downloadOptions: {
            distro: replsetDistro,
          },
        });
        expect(cluster.connectionString).to.be.a('string');
        expect(cluster.serverVersion).to.match(serverVersion);
        const hello = await cluster.withClient(async (client) => {
          return await client.db('admin').command({ hello: 1 });
        });
        expect(+hello.passives.length + +hello.hosts.length).to.equal(3);
      });

      it(`can spawn a ${version} sharded env using docker`, async function () {
        cluster = await startOrSkip(this, {
          version,
          topology: 'sharded',
          tmpDir,
          docker,
          shards: 1,
          secondaries: 0,
          downloadOptions: {
            distro: otherDistro,
          },
        });
        expect(cluster.connectionString).to.be.a('string');
        expect(cluster.serverVersion).to.match(serverVersion);
        const hello = await cluster.withClient(async (client) => {
          return await client.db('admin').command({ hello: 1 });
        });
        expect(hello.msg).to.equal('isdbgrid');
      });

      it(`can spawn a ${version} standalone mongod with TLS enabled and get build info`, async function () {
        cluster = await startOrSkip(this, {
          version,
          topology: 'standalone',
          tmpDir,
          args: tlsArgs,
          docker: [
            `--volume=${path.resolve(__dirname, '..')}:/projectroot:ro`,
            docker,
          ],
          downloadOptions: {
            distro: otherDistro,
          },
        });
        expect(cluster.connectionString).to.be.a('string');
        expect(cluster.serverVersion).to.match(serverVersion);
        expect(cluster.serverVariant).to.equal('community');
      });
    }
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

  it('can serialize and deserialize sharded cluster with keyfile and auth (no enableTestCommands)', async function () {
    const keyFile = path.join(tmpDir, 'keyFile2');
    await fs.writeFile(keyFile, 'secret', { mode: 0o400 });
    cluster = await MongoCluster.start({
      version: '8.x',
      topology: 'sharded',
      tmpDir,
      secondaries: 0,
      users: [
        {
          username: 'testuser',
          password: 'testpass',
          roles: [{ role: 'readWriteAnyDatabase', db: 'admin' }],
        },
      ],
      args: ['--keyFile', keyFile],
    });
    cluster = await MongoCluster.deserialize(cluster.serialize());
    await cluster.withClient(async (client) => {
      expect(
        (await client.db('admin').command({ connectionStatus: 1 })).authInfo
          .authenticatedUsers,
      ).to.deep.equal([{ user: 'testuser', db: 'admin' }]);
    });
    await cluster.close();
  });

  it('can serialize and deserialize sharded cluster with keyfile and auth (enableTestCommands=true)', async function () {
    const keyFile = path.join(tmpDir, 'keyFile3');
    await fs.writeFile(keyFile, 'secret', { mode: 0o400 });
    cluster = await MongoCluster.start({
      version: '8.x',
      topology: 'sharded',
      tmpDir,
      secondaries: 0,
      users: [
        {
          username: 'testuser',
          password: 'testpass',
          roles: [{ role: 'readWriteAnyDatabase', db: 'admin' }],
        },
      ],
      args: ['--keyFile', keyFile, '--setParameter', 'enableTestCommands=true'],
    });
    cluster = await MongoCluster.deserialize(cluster.serialize());
    const doc = await cluster.withClient(
      async (client) => {
        expect(
          (await client.db('admin').command({ connectionStatus: 1 })).authInfo
            .authenticatedUsers,
        ).to.deep.equal([{ user: '__system', db: 'local' }]);
        return await client.db('config').collection('mongodbrunner').findOne();
      },
      { auth: { username: '__system', password: 'secret' } },
    );
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
    expect(cluster.serverVersion).to.match(/^8\./);
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
      shards: [
        { args: ['--setParameter', 'cursorTimeoutMillis=60000'] },
        { args: ['--setParameter', 'cursorTimeoutMillis=50000'] },
      ],
    });

    expect(cluster.connectionString).to.be.a('string');
    expect(cluster.serverVersion).to.match(/^8\./);

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
    expect(cluster.serverVersion).to.match(/^8\./);

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

    await eventually(async () => {
      const mongosList = await cluster.withClient(
        async (client) =>
          await client.db('config').collection('mongos').find().toArray(),
      );
      expect(mongosList).to.have.lengthOf(2);
    });
  });

  it('can spawn a sharded cluster with a pre-specified port for mongos (--port x)', async function () {
    cluster = await MongoCluster.start({
      version: '8.x',
      topology: 'sharded',
      tmpDir,
      secondaries: 0,
      mongosArgs: [['--port', '50082']],
    });
    expect(cluster.connectionString).to.include(`:50082`);
  });

  it('can spawn a sharded cluster with a pre-specified port for mongos (--port=x)', async function () {
    cluster = await MongoCluster.start({
      version: '8.x',
      topology: 'sharded',
      tmpDir,
      secondaries: 0,
      mongosArgs: [['--port=50083']],
    });
    expect(cluster.connectionString).to.include(`:50083`);
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
    expect(cluster.serverVersion).to.match(/^8\./);
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

  it('can use a keyFile', async function () {
    const keyFile = path.join(tmpDir, 'keyFile');
    await fs.writeFile(keyFile, 'secret', { mode: 0o400 });
    cluster = await MongoCluster.start({
      version: '8.x',
      topology: 'replset',
      tmpDir,
      secondaries: 1,
      arbiters: 1,
      args: ['--keyFile', keyFile],
      users: [
        {
          username: 'testuser',
          password: 'testpass',
          roles: [
            { role: 'userAdminAnyDatabase', db: 'admin' },
            { role: 'clusterAdmin', db: 'admin' },
          ],
        },
      ],
    });
    expect(cluster.connectionString).to.be.a('string');
    expect(cluster.serverVersion).to.match(/^8\./);
    expect(cluster.connectionString).to.include('testuser:testpass@');
    cluster = await MongoCluster.deserialize(cluster.serialize());
    expect(cluster.connectionString).to.include('testuser:testpass@');
  });

  it('can start an authenticated replica set with createKeyFile', async function () {
    cluster = await MongoCluster.start({
      version: '8.x',
      topology: 'replset',
      tmpDir,
      secondaries: 1,
      createKeyFile: true,
      users: [
        {
          username: 'testuser',
          password: 'testpass',
          roles: ['root'],
        },
      ],
    });
    expect(cluster.connectionString).to.include('testuser:testpass@');

    const serialized = cluster.serialize();
    for (const server of serialized.servers) {
      expect(
        server.commandline,
        'every replica set member must have received the generated keyfile',
      ).to.contain('--keyFile');
    }
    expect(
      new Set(
        serialized.servers.map(
          (srv) => srv.commandline?.[srv.commandline.indexOf('--keyFile') + 1],
        ),
      ).size,
      'all replica set members must share the generated keyfile',
    ).to.equal(1);
    expect(
      serialized.servers[0].keyFileContents,
      'the generated keyfile contents must be non-empty base64',
    ).to.match(/^[A-Za-z0-9+/=]+$/);

    // The keyfile must have enabled authorization: with a user existing, the
    // localhost exception is closed and writes without credentials fail.
    const unauthClient = new MongoClient(
      cluster.connectionString.replace(/^mongodb:\/\/[^@]*@/, 'mongodb://'),
      SHORT_TIMEOUTS,
    );
    try {
      let err: unknown;
      try {
        await unauthClient.db('test').collection('test').insertOne({});
      } catch (e) {
        err = e;
      }
      expect(
        err,
        'unauthenticated writes should be rejected on the authenticated replica set',
      ).to.be.instanceOf(MongoServerError);
      expect((err as MongoServerError).codeName).to.equal('Unauthorized');
    } finally {
      await unauthClient.close(true);
    }

    // Authenticated writes keep working after a serialize/deserialize round trip.
    cluster = await MongoCluster.deserialize(serialized);
    await cluster.withClient(async (client) => {
      await client.db('test').collection('test').insertOne({ foo: 42 });
    });
  });

  it('can start an authenticated sharded cluster with createKeyFile, dropping --auth', async function () {
    cluster = await MongoCluster.start({
      version: '8.x',
      topology: 'sharded',
      tmpDir,
      shards: 1,
      secondaries: 0,
      createKeyFile: true,
      args: ['--auth'],
      users: [
        {
          username: 'testuser',
          password: 'testpass',
          roles: ['root'],
        },
      ],
    });
    expect(cluster.connectionString).to.include('testuser:testpass@');
    await cluster.withClient(async (client) => {
      const hello = await client.db('admin').command({ hello: 1 });
      expect(
        hello.msg,
        'the cluster should be reachable through mongos',
      ).to.equal('isdbgrid');
      await client.db('test').collection('test').insertOne({ foo: 42 });
    });

    const serialized = cluster.serialize();
    const allServers = [
      ...serialized.servers,
      ...serialized.shards.flatMap((shard) => shard.servers),
    ];
    for (const server of allServers) {
      expect(
        server.commandline,
        'every server must have received the generated keyfile',
      ).to.contain('--keyFile');
      expect(
        server.commandline,
        'no server should have received the --auth switch',
      ).to.not.contain('--auth');
    }
    expect(
      new Set(
        allServers.map(
          (srv) => srv.commandline?.[srv.commandline.indexOf('--keyFile') + 1],
        ),
      ).size,
      'mongos and every shard member must share the generated keyfile',
    ).to.equal(1);

    // Authorization is enforced through mongos as well.
    const unauthClient = new MongoClient(
      cluster.connectionString.replace(/^mongodb:\/\/[^@]*@/, 'mongodb://'),
      SHORT_TIMEOUTS,
    );
    try {
      let err: unknown;
      try {
        await unauthClient.db('test').collection('test').insertOne({});
      } catch (e) {
        err = e;
      }
      expect(
        err,
        'unauthenticated writes should be rejected through mongos',
      ).to.be.instanceOf(MongoServerError);
      expect((err as MongoServerError).codeName).to.equal('Unauthorized');
    } finally {
      await unauthClient.close(true);
    }
  });

  it('drops a bare --auth from per-mongos args on sharded clusters with createKeyFile', async function () {
    cluster = await MongoCluster.start({
      version: '8.x',
      topology: 'sharded',
      tmpDir,
      shards: 1,
      secondaries: 0,
      createKeyFile: true,
      mongosArgs: [['--auth']],
      users: [
        {
          username: 'testuser',
          password: 'testpass',
          roles: ['root'],
        },
      ],
    });
    expect(cluster.connectionString).to.include('testuser:testpass@');
    await cluster.withClient(async (client) => {
      const hello = await client.db('admin').command({ hello: 1 });
      expect(
        hello.msg,
        'the cluster should be reachable through mongos',
      ).to.equal('isdbgrid');
    });
    const serialized = cluster.serialize();
    for (const server of [
      ...serialized.servers,
      ...serialized.shards.flatMap((shard) => shard.servers),
    ]) {
      expect(
        server.commandline,
        'no server should have received the --auth switch',
      ).to.not.contain('--auth');
      expect(
        server.commandline,
        'every server must have received the generated keyfile',
      ).to.contain('--keyFile');
    }
  });

  it('rejects createKeyFile combined with --keyFile', async function () {
    const keyFile = path.join(tmpDir, 'keyFileOwnSharded');
    await fs.writeFile(keyFile, 'ownkeyfilesecret', { mode: 0o400 });
    let err: unknown;
    try {
      await MongoCluster.start({
        version: '8.x',
        topology: 'sharded',
        tmpDir,
        shards: 1,
        secondaries: 0,
        createKeyFile: true,
        args: ['--auth', '--keyFile', keyFile],
      });
    } catch (e) {
      err = e;
    }
    expect(err, 'start should have failed').to.be.instanceOf(Error);
    expect((err as Error).message).to.include(
      'createKeyFile cannot be combined with --keyFile',
    );
  });

  it('rejects createKeyFile combined with --keyFile in per-shard args', async function () {
    const keyFile = path.join(tmpDir, 'keyFilePerShard');
    await fs.writeFile(keyFile, 'pershardsecret', { mode: 0o400 });
    let err: unknown;
    try {
      await MongoCluster.start({
        version: '8.x',
        topology: 'sharded',
        tmpDir,
        createKeyFile: true,
        shards: [{ args: ['--keyFile', keyFile] }],
      });
    } catch (e) {
      err = e;
    }
    expect(err, 'start should have failed').to.be.instanceOf(Error);
    expect((err as Error).message).to.include(
      'createKeyFile cannot be combined with --keyFile',
    );
  });

  it('rejects createKeyFile combined with --keyFile in per-shard member args', async function () {
    const keyFile = path.join(tmpDir, 'keyFilePerShardMember');
    await fs.writeFile(keyFile, 'pershardmembersecret', { mode: 0o400 });
    let err: unknown;
    try {
      await MongoCluster.start({
        version: '8.x',
        topology: 'sharded',
        tmpDir,
        createKeyFile: true,
        shards: [{ rsMembers: [{ args: ['--keyFile', keyFile] }] }],
      });
    } catch (e) {
      err = e;
    }
    expect(err, 'start should have failed').to.be.instanceOf(Error);
    expect((err as Error).message).to.include(
      'createKeyFile cannot be combined with --keyFile',
    );
  });

  it('can start an authenticated standalone cluster with createKeyFile', async function () {
    cluster = await MongoCluster.start({
      version: '8.x',
      topology: 'standalone',
      tmpDir,
      createKeyFile: true,
      users: [
        {
          username: 'testuser',
          password: 'testpass',
          roles: ['root'],
        },
      ],
    });
    expect(cluster.connectionString).to.include('testuser:testpass@');
    await cluster.withClient(async (client) => {
      await client.db('test').collection('test').insertOne({ foo: 42 });
    });
    expect(
      cluster.serialize().servers[0].commandline,
      'the standalone server must have received the generated keyfile',
    ).to.contain('--keyFile');

    // The keyfile enforces authorization: with a user existing, writes
    // without credentials fail.
    const unauthClient = new MongoClient(
      cluster.connectionString.replace(/^mongodb:\/\/[^@]*@/, 'mongodb://'),
      SHORT_TIMEOUTS,
    );
    try {
      let err: unknown;
      try {
        await unauthClient.db('test').collection('test').insertOne({});
      } catch (e) {
        err = e;
      }
      expect(
        err,
        'unauthenticated writes should be rejected on the authenticated standalone server',
      ).to.be.instanceOf(MongoServerError);
      expect((err as MongoServerError).codeName).to.equal('Unauthorized');
    } finally {
      await unauthClient.close(true);
    }
  });

  it('passes --auth and a supplied --keyFile through untouched on a replica set', async function () {
    const keyFile = path.join(tmpDir, 'keyFileReplsetNoFlag');
    await fs.writeFile(keyFile, 'replsetnoflagsecret', { mode: 0o400 });
    cluster = await MongoCluster.start({
      version: '8.x',
      topology: 'replset',
      tmpDir,
      secondaries: 0,
      args: ['--auth', '--keyFile', keyFile],
    });
    const commandline = cluster.serialize().servers[0].commandline ?? [];
    expect(
      commandline,
      'without createKeyFile, --auth and --keyFile must pass through as-is',
    ).to.contain('--auth');
    expect(commandline).to.contain(keyFile);
  });

  it('rejects --auth without createKeyFile on a replica set', async function () {
    let err: unknown;
    try {
      await MongoCluster.start({
        version: '8.x',
        topology: 'replset',
        tmpDir,
        secondaries: 0,
        args: ['--auth'],
      });
    } catch (e) {
      err = e;
    }
    expect(err, 'start should have failed').to.be.instanceOf(Error);
    expect((err as Error).message).to.include(
      '--auth cannot start this cluster',
    );
    expect((err as Error).message).to.include('--createKeyFile');
  });

  it('rejects --auth on sharded clusters without createKeyFile, even with a keyfile', async function () {
    const keyFile = path.join(tmpDir, 'keyFileShardedNoFlag');
    await fs.writeFile(keyFile, 'shardednoflagsecret', { mode: 0o400 });
    let err: unknown;
    try {
      await MongoCluster.start({
        version: '8.x',
        topology: 'sharded',
        tmpDir,
        shards: 1,
        secondaries: 0,
        args: ['--auth', '--keyFile', keyFile],
      });
    } catch (e) {
      err = e;
    }
    expect(err, 'start should have failed').to.be.instanceOf(Error);
    expect((err as Error).message).to.include(
      '--auth cannot start this cluster',
    );
    expect((err as Error).message).to.include(
      'Remove --auth; --keyFile already enables authorization',
    );
  });

  it('does not reject --auth with a server config file, which may supply the keyfile', async function () {
    let err: unknown;
    try {
      await MongoCluster.start({
        version: '8.x',
        topology: 'replset',
        tmpDir,
        secondaries: 0,
        args: ['--auth', '--config', path.join(tmpDir, 'nonexistent.yaml')],
      });
    } catch (e) {
      err = e;
    }
    // The server (not the runner) rejects the missing config file here.
    expect(err, 'start should have failed').to.be.instanceOf(Error);
    expect((err as Error).message).to.not.include(
      '--auth cannot start this cluster',
    );
  });

  it('does not reject --auth with --clusterAuthMode x509, which needs no keyfile', async function () {
    let err: unknown;
    try {
      await MongoCluster.start({
        version: '8.x',
        topology: 'replset',
        tmpDir,
        secondaries: 0,
        args: ['--auth', '--clusterAuthMode', 'x509'],
      });
    } catch (e) {
      err = e;
    }
    // x509 internal auth is valid without a keyfile; the server itself
    // rejects this start only for the missing TLS configuration.
    expect(err, 'start should have failed').to.be.instanceOf(Error);
    expect((err as Error).message).to.not.include(
      '--auth cannot start this cluster',
    );
  });

  it('does not reject --auth with --clusterAuthMode in member args', async function () {
    let err: unknown;
    try {
      await MongoCluster.start({
        version: '8.x',
        topology: 'replset',
        tmpDir,
        secondaries: 0,
        args: ['--auth'],
        rsMembers: [{ args: ['--clusterAuthMode', 'x509'] }],
      });
    } catch (e) {
      err = e;
    }
    // The per-member auth mode is merged into the server args, so the
    // runner's --auth rejection must not fire; the server itself rejects
    // this start only for the missing TLS configuration.
    expect(err, 'start should have failed').to.be.instanceOf(Error);
    expect((err as Error).message).to.not.include(
      '--auth cannot start this cluster',
    );
  });

  it('passes --auth with per-member --keyFile through untouched on a replica set', async function () {
    const keyFile = path.join(tmpDir, 'keyFilePerMember');
    await fs.writeFile(keyFile, 'permembersecret', { mode: 0o400 });
    cluster = await MongoCluster.start({
      version: '8.x',
      topology: 'replset',
      tmpDir,
      args: ['--auth'],
      rsMembers: [{ args: ['--keyFile', keyFile] }],
    });
    const commandline = cluster.serialize().servers[0].commandline ?? [];
    expect(
      commandline,
      'the member args must be merged with the main args as-is',
    ).to.contain('--auth');
    expect(commandline).to.contain(keyFile);
  });

  it('releases reserved storage ports when createKeyFile is rejected', async function () {
    let released = false;
    let err: unknown;
    try {
      await MongoCluster.start({
        version: '8.x',
        topology: 'replset',
        tmpDir,
        secondaries: 0,
        createKeyFile: true,
        args: ['--clusterAuthMode', 'x509'],
        disaggregatedStorage: {
          composeFile: '/nonexistent/docker-compose.yml',
          config: 'unused',
          beforeComposeUp: () => {
            released = true;
          },
        },
      });
    } catch (e) {
      err = e;
    }
    expect(err, 'start should have failed').to.be.instanceOf(Error);
    expect((err as Error).message).to.include(
      'createKeyFile conflicts with --clusterAuthMode',
    );
    expect(
      released,
      'the reserved storage ports must be released on the failed start',
    ).to.be.true;
  });

  it('rejects createKeyFile combined with --clusterAuthMode', async function () {
    let err: unknown;
    try {
      await MongoCluster.start({
        version: '8.x',
        topology: 'replset',
        tmpDir,
        createKeyFile: true,
        args: ['--clusterAuthMode', 'x509'],
      });
    } catch (e) {
      err = e;
    }
    expect(err, 'start should have failed').to.be.instanceOf(Error);
    expect((err as Error).message).to.include(
      'createKeyFile conflicts with --clusterAuthMode',
    );
  });

  it('rejects createKeyFile in docker mode', async function () {
    let err: unknown;
    try {
      await MongoCluster.start({
        version: '8.x',
        topology: 'replset',
        tmpDir,
        docker: 'mongo:8.0',
        createKeyFile: true,
      });
    } catch (e) {
      err = e;
    }
    expect(err, 'start should have failed').to.be.instanceOf(Error);
    expect((err as Error).message).to.include(
      'createKeyFile is not available in docker mode',
    );
  });

  it('can support requireApiVersion', async function () {
    cluster = await MongoCluster.start({
      version: '8.x',
      topology: 'sharded',
      tmpDir,
      secondaries: 1,
      shards: 1,
      requireApiVersion: 1,
      args: ['--setParameter', 'enableTestCommands=1'],
    });
    expect(cluster.connectionString).to.be.a('string');
    expect(cluster.serverVersion).to.match(/^8\./);
    await cluster.withClient((client) => {
      expect(client.serverApi?.version).to.eq('1');
    });
    cluster = await MongoCluster.deserialize(cluster.serialize());
    await cluster.withClient((client) => {
      expect(client.serverApi?.version).to.eq('1');
    });
  });

  describe('serialization', function () {
    it('can serialize metadata written before the options field existed', async function () {
      // Older metadata has no `options` key; serializing it again must not throw.
      const cluster = await MongoCluster.deserialize({
        topology: 'standalone',
        servers: [],
        shards: [],
        defaultConnectionOptions: {},
        users: [],
      });
      expect(() => cluster.serialize()).to.not.throw();
    });
  });

  describe('redactSerializedCluster', function () {
    it('removes credentials recursively without mutating the input', function () {
      const serialized = {
        topology: 'replset',
        replSetName: 'repl0',
        servers: [
          {
            _id: 'a',
            keyFileContents: 'server-keyfile-secret',
            commandline: ['mongod', '--auth'],
          },
          {
            _id: 'b',
            commandline: [
              'mongod',
              '--tlsCertificateKeyFilePassword',
              'arg-secret',
            ],
          },
          {
            _id: 'c',
            commandline: [
              'mongod',
              '--tlsCertificateKeyFilePassword=eq-secret',
            ],
          },
        ],
        shards: [
          {
            topology: 'replset',
            servers: [{ _id: 'd', keyFileContents: 'shard-keyfile-secret' }],
            shards: [],
            defaultConnectionOptions: { auth: { password: 'nested-password' } },
            users: [
              { username: 'nested', password: 'nested-password', roles: [] },
            ],
          },
        ],
        defaultConnectionOptions: {
          tlsCertificateKeyFilePassword: 'tls-secret',
        },
        users: [{ username: 'top', password: 'top-password', roles: [] }],
        options: {
          topology: 'replset',
          args: ['--auth'],
          users: [{ username: 'opt', password: 'option-password', roles: [] }],
        },
      } as unknown as SerializedClusterProperties;

      const redacted = redactSerializedCluster(serialized);

      const json = JSON.stringify(redacted);
      for (const secret of [
        'server-keyfile-secret',
        'shard-keyfile-secret',
        'arg-secret',
        'eq-secret',
        'nested-password',
        'top-password',
        'option-password',
        'tls-secret',
      ]) {
        expect(json, `should not contain ${secret}`).to.not.contain(secret);
      }

      // Non-secret data is preserved.
      expect(redacted.servers[0]._id).to.eq('a');
      expect(redacted.users[0].username).to.eq('top');
      expect(redacted.options?.args).to.deep.eq(['--auth']);

      // The stored metadata is left untouched.
      expect(serialized.servers[0].keyFileContents).to.eq(
        'server-keyfile-secret',
      );
      expect(serialized.users[0].password).to.eq('top-password');
    });
  });
});
