import { expect } from 'chai';
import { MongoServer } from './mongoserver';
import { MongoServerError } from 'mongodb';
import type { MongoClient, MongoClientOptions } from 'mongodb';
import sinon from 'sinon';
import * as tailFile from './tail-file';
import type { FileTailStream } from './tail-file';
import { PassThrough } from 'stream';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

function writeFakeServer(
  dir: string,
  name: string,
  body: string,
): Promise<string> {
  const file = path.join(dir, name);
  return fs
    .writeFile(file, `#!/bin/sh\n${body}\n`, { mode: 0o755 })
    .then(() => file);
}

const LISTENER_LINE =
  '{"t":{"$date":"2026-01-01T00:00:00.000Z"},"s":"I","c":"NETWORK","ctx":"listener",' +
  '"id":23016,"msg":"waiting for connections","attr":{"port":47119}}';

const BIND_FAILURE_LINE =
  '{"t":{"$date":"2026-01-01T00:00:00.000Z"},"s":"E","c":"NETWORK","ctx":"listener",' +
  '"id":22856,"msg":"Failed to set up listener","attr":{"error":"Address already in use"}}';

describe('MongoServer', function () {
  let server: MongoServer;

  beforeEach(function () {
    server = new MongoServer();
  });

  afterEach(function () {
    sinon.restore();
  });

  function makeClient(responses: Array<Record<string, unknown>>): {
    client: MongoClient;
    commandStub: sinon.SinonStub;
  } {
    let callCount = 0;
    const commandStub = sinon
      .stub()
      .callsFake(() => responses[Math.min(callCount++, responses.length - 1)]);
    const client = {
      db: sinon.stub().returns({ command: commandStub }),
    } as unknown as MongoClient;
    return { client, commandStub };
  }

  it('skips metadata check immediately when hello already reports arbiterOnly', async function () {
    server.isArbiter = true;
    const { client, commandStub } = makeClient([{ arbiterOnly: true }]);

    await (server as any)._ensureMatchingMetadataColl(client, 'insert-new');

    // Only the initial hello call; no retries needed.
    expect(commandStub).to.have.been.calledOnce;
  });

  it('retries hello until arbiterOnly is confirmed when arbiter has not yet converged', async function () {
    server.isArbiter = true;
    // First hello returns nothing; second (inside eventually) returns arbiterOnly.
    const { client, commandStub } = makeClient([{}, { arbiterOnly: true }]);

    await (server as any)._ensureMatchingMetadataColl(client, 'insert-new');

    // Two hello calls: the initial one and one successful retry.
    expect(commandStub.callCount).to.equal(2);
  });

  it('throws after timeout when isArbiter is true but server never reports arbiterOnly', async function () {
    server.isArbiter = true;
    const { client } = makeClient([{}]); // never returns arbiterOnly: true

    let err: Error | undefined;
    try {
      await (server as any)._ensureMatchingMetadataColl(client, 'insert-new', {
        intervalMs: 10,
        timeoutMs: 50,
      });
    } catch (e) {
      err = e as Error;
    }

    expect(err?.message).to.include(
      'Arbiter flag mismatch -- server should be arbiter but hello indicates it is not',
    );
  });

  it('skips metadata check when hello reports arbiterOnly but isArbiter is not yet set', async function () {
    // Simulates the deserialize() ordering: isArbiter is assigned after _populateBuildInfo runs.
    server.isArbiter = false;
    const { client, commandStub } = makeClient([{ arbiterOnly: true }]);

    await (server as any)._ensureMatchingMetadataColl(client, 'restore-check');

    expect(commandStub).to.have.been.calledOnce;
  });

  describe('assertHasInsertedLocalMetadata', function () {
    it('does not throw when a server started with --auth rejects the metadata write as unauthorized', async function () {
      // Servers started with --auth but without users the runner can use cannot
      // be reached for bookkeeping, which must not fail cluster startup.
      server.isAuth = true;
      sinon.stub(server, 'withClient').rejects(
        new MongoServerError({
          code: 13,
          codeName: 'Unauthorized',
          message:
            'not authorized on local to execute command { find: "mongodbrunner" }',
        }),
      );

      await server.assertHasInsertedLocalMetadata();
    });

    it('throws on an unauthorized metadata write when the server was not started with --auth', async function () {
      // Without --auth, an Unauthorized response means we cannot confirm we are
      // talking to the instance we intended to, so it must remain fatal.
      sinon.stub(server, 'withClient').rejects(
        new MongoServerError({
          code: 13,
          codeName: 'Unauthorized',
          message:
            'not authorized on local to execute command { find: "mongodbrunner" }',
        }),
      );

      let err: Error | undefined;
      try {
        await server.assertHasInsertedLocalMetadata();
      } catch (e) {
        err = e as Error;
      }

      expect(err).to.be.an.instanceOf(MongoServerError);
    });

    it('throws on an unauthorized metadata write for a mongos that was not started with --auth', async function () {
      // mongos/configsvr/DSC normally tolerate populate errors, but an auth
      // rejection is still fatal when the server was not started with --auth.
      server.isMongos = true;
      sinon.stub(server, 'withClient').rejects(
        new MongoServerError({
          code: 13,
          codeName: 'Unauthorized',
          message:
            'not authorized on local to execute command { find: "mongodbrunner" }',
        }),
      );

      let err: Error | undefined;
      try {
        await server.assertHasInsertedLocalMetadata();
      } catch (e) {
        err = e as Error;
      }

      expect(err).to.be.an.instanceOf(MongoServerError);
    });

    it('throws when the metadata population fails for any other reason', async function () {
      sinon
        .stub(server, 'withClient')
        .rejects(new MongoServerError({ code: 6, message: 'host not found' }));

      let err: Error | undefined;
      try {
        await server.assertHasInsertedLocalMetadata();
      } catch (e) {
        err = e as Error;
      }

      expect(err).to.be.an.instanceOf(MongoServerError);
    });
  });

  it('rejects --logpath and --syslog instead of waiting forever for a listener line', async function () {
    if (process.platform === 'win32') this.skip();
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'runner-logdiv-'));
    const binDir = path.join(tmpDir, 'bin');
    await fs.mkdir(binDir);
    await writeFakeServer(binDir, 'fake-mongod', 'exec sleep 300');
    try {
      for (const args of [
        ['--logpath', path.join(tmpDir, 'server.log')],
        [`--logpath=${path.join(tmpDir, 'server.log')}`],
        ['--syslog'],
      ]) {
        let rejection: unknown;
        try {
          await MongoServer.start({
            binary: 'fake-mongod',
            binDir,
            tmpDir,
            args,
          });
          rejection = 'start resolved';
        } catch (err) {
          rejection = err;
        }
        expect(String(rejection)).to.match(/logDir/);
      }
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('fails fast when the server process exits before reporting its listener', async function () {
    if (process.platform === 'win32') this.skip();
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'runner-exit-'));
    const binDir = path.join(tmpDir, 'bin');
    await fs.mkdir(binDir);
    await writeFakeServer(binDir, 'fake-mongod', 'exit 3');
    try {
      let rejection: unknown;
      try {
        await MongoServer.start({
          binary: 'fake-mongod',
          binDir,
          tmpDir,
          startTimeoutMS: 60_000,
        });
        rejection = 'start resolved';
      } catch (err) {
        rejection = err;
      }
      expect(String(rejection)).to.match(
        /fake-mongod .*exited before reporting its listener/,
      );
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('includes the errors the server logged before exiting in the exit error', async function () {
    if (process.platform === 'win32') this.skip();
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'runner-exit-diag-'),
    );
    const binDir = path.join(tmpDir, 'bin');
    await fs.mkdir(binDir);
    const ERROR_LINE =
      '{"t":{"$date":"2026-01-01T00:00:00.000Z"},"s":"E","c":"CONTROL","ctx":"initandlisten",' +
      '"id":20322,"msg":"Failed to parse configuration"}';
    await writeFakeServer(
      binDir,
      'fake-mongod',
      `echo '${ERROR_LINE}'; exit 3`,
    );
    try {
      let rejection: unknown;
      try {
        await MongoServer.start({ binary: 'fake-mongod', binDir, tmpDir });
        rejection = 'start resolved';
      } catch (err) {
        rejection = err;
      }
      expect(String(rejection)).to.match(
        /fake-mongod .*exited before reporting its listener/,
      );
      expect(String(rejection)).to.include('Failed to parse configuration');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('rejects a server that exits after reporting its listener', async function () {
    if (process.platform === 'win32') this.skip();
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'runner-exit-listen-'),
    );
    const binDir = path.join(tmpDir, 'bin');
    await fs.mkdir(binDir);
    await writeFakeServer(binDir, 'fake-mongod', 'exit 7');
    // The real log reader reads the file immediately, so a listener line can
    // arrive before the exit event. The stub delivers the line only on the
    // exit event and intercepts because mongoserver calls the export through
    // the module's namespace object.
    const tailStub = sinon
      .stub(tailFile, 'tailFileUntilExit')
      .callsFake((_outFile, proc) => {
        const stream = new PassThrough({ encoding: 'utf8' });
        Object.assign(stream, { ref: () => {}, unref: () => {} });
        proc.once('exit', () => {
          stream.write(LISTENER_LINE);
          stream.end();
        });
        return stream as unknown as FileTailStream;
      });
    try {
      let rejection: unknown;
      try {
        await MongoServer.start({
          binary: 'fake-mongod',
          binDir,
          tmpDir,
          logDir: path.join(tmpDir, 'logs'),
        });
        rejection = 'start resolved';
      } catch (err) {
        rejection = err;
      }
      expect(String(rejection)).to.match(
        /fake-mongod .*exited before reporting its listener/,
      );
    } finally {
      tailStub.restore();
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('caps the startup client timeouts at the startup bound', async function () {
    if (process.platform === 'win32') this.skip();
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'runner-client-timeout-'),
    );
    const binDir = path.join(tmpDir, 'bin');
    await fs.mkdir(binDir);
    await writeFakeServer(
      binDir,
      'fake-mongod',
      `echo '${LISTENER_LINE}'; exec sleep 300`,
    );
    // Capture the client options the startup metadata and buildInfo
    // operations receive.
    let captured: Partial<MongoClientOptions> | undefined;
    const captureWithClient = async (
      fn: (client: MongoClient) => Promise<unknown>,
      clientOpts?: MongoClientOptions,
    ): Promise<unknown> => {
      captured = clientOpts;
      const commandStub = sinon.stub().resolves({});
      const runnerColl = {
        findOne: sinon.stub().resolves(null),
        insertOne: sinon.stub().resolves(),
      };
      const fakeClient = {
        db: sinon
          .stub()
          .returns({ command: commandStub, collection: () => runnerColl }),
      } as unknown as MongoClient;
      return await fn(fakeClient);
    };
    sinon
      .stub(MongoServer.prototype, 'withClient')
      .callsFake(captureWithClient);
    try {
      // The driver maps a zero serverSelectionTimeoutMS or connectTimeoutMS
      // to no timeout, so the zeros come out capped.
      const srv = await MongoServer.start({
        binary: 'fake-mongod',
        binDir,
        tmpDir,
        startTimeoutMS: 5000,
        internalClientOptions: {
          timeoutMS: 1000,
          serverSelectionTimeoutMS: 0,
          connectTimeoutMS: 0,
        },
      });
      expect(captured?.timeoutMS).to.equal(1000);
      expect(captured?.serverSelectionTimeoutMS).to.equal(5000);
      expect(captured?.connectTimeoutMS).to.equal(5000);
      await srv.close();
    } finally {
      sinon.restore();
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('drains the server log after exit so a bind failure still retries', async function () {
    this.timeout(180_000);
    if (process.platform === 'win32') this.skip();
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'runner-drain-'));
    const binDir = path.join(tmpDir, 'bin');
    await fs.mkdir(binDir);
    // The exit happens before the logDir reader's next poll
    // (POLL_INTERVAL_MS), so the bind failure is still undelivered when the
    // exit is observed.
    await writeFakeServer(
      binDir,
      'mongos',
      `echo '${BIND_FAILURE_LINE}'; exit 48`,
    );
    try {
      let rejection: unknown;
      try {
        await MongoServer.start({
          binary: 'mongos',
          binDir,
          tmpDir,
          logDir: path.join(tmpDir, 'logs'),
          startTimeoutMS: 10_000,
        });
        rejection = 'start resolved';
      } catch (err) {
        rejection = err;
      }
      expect(String(rejection)).to.match(
        /could not find a free port after 1000 attempts/,
      );
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('fails after startTimeoutMS when the server never reports its listener', async function () {
    if (process.platform === 'win32') this.skip();
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'runner-stall-'));
    const binDir = path.join(tmpDir, 'bin');
    await fs.mkdir(binDir);
    await writeFakeServer(binDir, 'fake-mongod', 'exec sleep 300');
    try {
      let rejection: unknown;
      try {
        await MongoServer.start({
          binary: 'fake-mongod',
          binDir,
          tmpDir,
          startTimeoutMS: 500,
        });
        rejection = 'start resolved';
      } catch (err) {
        rejection = err;
      }
      expect(String(rejection)).to.match(
        /did not report its listener within 500ms/,
      );
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('gives up after bounded mongos port retries instead of looping forever', async function () {
    this.timeout(60_000);
    if (process.platform === 'win32') this.skip();
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'runner-retry-'));
    const binDir = path.join(tmpDir, 'bin');
    await fs.mkdir(binDir);
    // Prints a bind failure, then sleeps briefly so the runner sees the log
    // line. Named 'mongos' because the retry loop only applies to that name.
    await writeFakeServer(
      binDir,
      'mongos',
      `echo '${BIND_FAILURE_LINE}'; sleep 0.5; exit 48`,
    );
    try {
      let rejection: unknown;
      try {
        await MongoServer.start({
          binary: 'mongos',
          binDir,
          tmpDir,
          startTimeoutMS: 10_000,
        });
        rejection = 'start resolved';
      } catch (err) {
        rejection = err;
      }
      expect(String(rejection)).to.match(
        /could not find a free port after 1000 attempts/,
      );
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('fails the start when a mongos exits without a listener-setup failure', async function () {
    if (process.platform === 'win32') this.skip();
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'runner-noretry-'));
    const binDir = path.join(tmpDir, 'bin');
    await fs.mkdir(binDir);
    await writeFakeServer(binDir, 'mongos', 'exit 3');
    try {
      let rejection: unknown;
      try {
        await MongoServer.start({ binary: 'mongos', binDir, tmpDir });
        rejection = 'start resolved';
      } catch (err) {
        rejection = err;
      }
      expect(String(rejection)).to.match(
        /exited before reporting its listener/,
      );
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
