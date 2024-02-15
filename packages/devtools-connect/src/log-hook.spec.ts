import { hookLogger } from '../';
import type { ConnectLogEmitter } from '../';
import { EventEmitter } from 'events';
import { MongoLogWriter } from 'mongodb-log-writer';
import { redactConnectionString } from 'mongodb-connection-string-url';
import { PassThrough } from 'stream';
import { expect } from 'chai';

describe('Logging setup', function () {
  it('logs events', async function () {
    const pt = new PassThrough();
    const log = new MongoLogWriter(
      'logid',
      null,
      pt,
      () => new Date('2021-12-16T14:35:08.763Z')
    );
    const emitter: ConnectLogEmitter = new EventEmitter();

    hookLogger(emitter, log, 'prefix', redactConnectionString);

    const connAttemptData = {
      driver: { name: 'nodejs', version: '3.6.1' },
      devtoolsConnectVersion: '1.0.0',
      host: 'localhost',
      uri: 'mongodb://localhost/',
    };
    emitter.emit(
      'devtools-connect:connect-attempt-initialized',
      connAttemptData
    );
    emitter.emit('devtools-connect:connect-heartbeat-failure', {
      connectionId: 'localhost',
      failure: new Error('cause'),
      isFailFast: true,
      isKnownServer: true,
    });
    emitter.emit('devtools-connect:connect-heartbeat-succeeded', {
      connectionId: 'localhost',
    });
    emitter.emit('devtools-connect:connect-fail-early');
    emitter.emit('devtools-connect:connect-attempt-finished', {
      cryptSharedLibVersionInfo: null,
    });
    emitter.emit('devtools-connect:connect-attempt-finished', {
      cryptSharedLibVersionInfo: { version: BigInt(16), versionStr: 'v1' },
    });
    emitter.emit('devtools-connect:resolve-srv-error', {
      from: 'mongodb+srv://foo:bar@hello.world/',
      error: new Error('failed'),
      duringLoad: false,
      resolutionDetails: [
        {
          query: 'SRV',
          hostname: 'hello.world',
          error: 'failed',
          wasNativelyLookedUp: false,
        },
      ],
    });
    emitter.emit('devtools-connect:resolve-srv-succeeded', {
      from: 'mongodb+srv://foo:bar@hello.world/',
      to: 'mongodb://foo:bar@db.hello.world/',
      resolutionDetails: [
        {
          query: 'SRV',
          hostname: 'hello.world',
          error: undefined,
          wasNativelyLookedUp: true,
        },
      ],
    });
    emitter.emit('devtools-connect:missing-optional-dependency', {
      name: 'kerberos',
      error: new Error('no kerberos'),
    });
    emitter.emit('devtools-connect:used-system-ca', {
      caCount: 1234,
      asyncFallbackError: new Error('had to fallback to sync'),
    });

    await log.flush();
    const logRawData: string = pt.setEncoding('utf8').read();
    const logContents = logRawData
      .split('\n')
      .filter(Boolean)
      .map((str) => JSON.parse(str));
    expect(logContents).to.deep.equal([
      {
        t: { $date: '2021-12-16T14:35:08.763Z' },
        s: 'I',
        c: 'DEVTOOLS-CONNECT',
        id: 1000000042,
        ctx: 'prefix-connect',
        msg: 'Initiating connection attempt',
        attr: {
          driver: { name: 'nodejs', version: '3.6.1' },
          devtoolsConnectVersion: '1.0.0',
          host: 'localhost',
          uri: 'mongodb://localhost/',
        },
      },
      {
        t: { $date: '2021-12-16T14:35:08.763Z' },
        s: 'W',
        c: 'DEVTOOLS-CONNECT',
        id: 1000000034,
        ctx: 'prefix-connect',
        msg: 'Server heartbeat failure',
        attr: {
          connectionId: 'localhost',
          failure: 'cause',
          isFailFast: true,
          isKnownServer: true,
        },
      },
      {
        t: { $date: '2021-12-16T14:35:08.763Z' },
        s: 'I',
        c: 'DEVTOOLS-CONNECT',
        id: 1000000035,
        ctx: 'prefix-connect',
        msg: 'Server heartbeat succeeded',
        attr: { connectionId: 'localhost' },
      },
      {
        t: { $date: '2021-12-16T14:35:08.763Z' },
        s: 'W',
        c: 'DEVTOOLS-CONNECT',
        id: 1000000036,
        ctx: 'prefix-connect',
        msg: 'Aborting connection attempt as irrecoverable',
      },
      {
        t: { $date: '2021-12-16T14:35:08.763Z' },
        s: 'I',
        c: 'DEVTOOLS-CONNECT',
        id: 1000000037,
        ctx: 'prefix-connect',
        msg: 'Connection attempt finished',
      },
      {
        t: { $date: '2021-12-16T14:35:08.763Z' },
        s: 'I',
        c: 'DEVTOOLS-CONNECT',
        id: 1000000037,
        ctx: 'prefix-connect',
        msg: 'Connection attempt finished',
        attr: {
          cryptSharedLibVersionInfo: { version: '10', versionStr: 'v1' },
        },
      },
      {
        t: { $date: '2021-12-16T14:35:08.763Z' },
        s: 'E',
        c: 'DEVTOOLS-CONNECT',
        id: 1000000038,
        ctx: 'prefix-connect',
        msg: 'Resolving SRV record failed',
        attr: {
          from: 'mongodb+srv://<credentials>@hello.world/',
          error: 'failed',
          duringLoad: false,
          resolutionDetails: [
            {
              query: 'SRV',
              error: 'failed',
              hostname: 'hello.world',
              wasNativelyLookedUp: false,
            },
          ],
        },
      },
      {
        t: { $date: '2021-12-16T14:35:08.763Z' },
        s: 'I',
        c: 'DEVTOOLS-CONNECT',
        id: 1000000039,
        ctx: 'prefix-connect',
        msg: 'Resolving SRV record succeeded',
        attr: {
          from: 'mongodb+srv://<credentials>@hello.world/',
          to: 'mongodb://<credentials>@db.hello.world/',
          resolutionDetails: [
            {
              query: 'SRV',
              error: null,
              hostname: 'hello.world',
              wasNativelyLookedUp: true,
            },
          ],
        },
      },
      {
        t: { $date: '2021-12-16T14:35:08.763Z' },
        s: 'E',
        c: 'DEVTOOLS-CONNECT',
        id: 1000000041,
        ctx: 'prefix-deps',
        msg: 'Missing optional dependency',
        attr: { name: 'kerberos', error: 'no kerberos' },
      },
      {
        t: { $date: '2021-12-16T14:35:08.763Z' },
        s: 'I',
        c: 'DEVTOOLS-CONNECT',
        id: 1000000049,
        ctx: 'prefix-connect',
        msg: 'Loaded system CA list',
        attr: { caCount: 1234, asyncFallbackError: 'had to fallback to sync' },
      },
    ]);
  });
});
