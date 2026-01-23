import { connectMongoClient } from './';
import type { DevtoolsConnectOptions } from './';
import { isHumanOidcFlow } from './connect';
import { EventEmitter, once } from 'events';
import { MongoClient } from 'mongodb';
import { MongoClient as MongoClient6 } from 'mongodb6';
import sinon, { stubConstructor } from 'ts-sinon';
import chai, { expect } from 'chai';
import sinonChai from 'sinon-chai';
import { Agent as HTTPSAgent } from 'https';
import { MongoCluster } from 'mongodb-runner';
import { tmpdir } from 'os';

chai.use(sinonChai);

describe('devtools connect', function () {
  let bus: EventEmitter;
  let defaultOpts: DevtoolsConnectOptions;

  beforeEach(function () {
    bus = new EventEmitter();
    defaultOpts = {
      productDocsLink: 'https://example.com',
      productName: 'Devtools Test',
    };
  });

  describe('connectMongoClient', function () {
    class FakeMongoClient extends EventEmitter {
      async connect(): Promise<any> {}
      db() {}
      close() {}
      topology: any;
      get options(): any {
        return {
          metadata: { driver: { name: 'nodejs', version: '3.6.1' } },
          hosts: ['localhost'],
        };
      }
    }

    it('connects once when no AutoEncryption set', async function () {
      const uri = 'localhost:27017';
      const mClient = stubConstructor(FakeMongoClient);
      const mClientType = sinon.stub().returns(mClient);
      mClient.connect.onFirstCall().resolves(mClient);
      const result = await connectMongoClient(
        uri,
        defaultOpts,
        bus,
        mClientType as any,
      );
      expect(mClientType.getCalls()).to.have.lengthOf(1);
      expect(mClientType.getCalls()[0].args).to.have.lengthOf(2);
      expect(mClientType.getCalls()[0].args[0]).to.equal(uri);
      expect(
        Object.keys(mClientType.getCalls()[0].args[1]).sort(),
      ).to.deep.equal([
        '__skipPingOnConnect',
        'allowPartialTrustChain',
        'ca',
        'lookup',
      ]);
      expect(mClient.connect.getCalls()).to.have.lengthOf(1);
      expect(result.client).to.equal(mClient);
    });

    it('connects once when bypassAutoEncryption is true', async function () {
      const uri = 'localhost:27017';
      const opts = { autoEncryption: { bypassAutoEncryption: true } };
      const mClient = stubConstructor(FakeMongoClient);
      const mClientType = sinon.stub().returns(mClient);
      mClient.connect.onFirstCall().resolves(mClient);
      const result = await connectMongoClient(
        uri,
        { ...defaultOpts, ...opts },
        bus,
        mClientType as any,
      );
      expect(mClientType.getCalls()).to.have.lengthOf(1);
      expect(mClientType.getCalls()[0].args).to.have.lengthOf(2);
      expect(mClientType.getCalls()[0].args[0]).to.equal(uri);
      expect(
        Object.keys(mClientType.getCalls()[0].args[1]).sort(),
      ).to.deep.equal([
        '__skipPingOnConnect',
        'allowPartialTrustChain',
        'autoEncryption',
        'ca',
        'lookup',
      ]);
      expect(mClientType.getCalls()[0].args[1].autoEncryption).to.deep.equal(
        opts.autoEncryption,
      );
      expect(mClient.connect.getCalls()).to.have.lengthOf(1);
      expect(result.client).to.equal(mClient);
    });

    it('connects twice when bypassAutoEncryption is false and enterprise via modules', async function () {
      const uri = 'localhost:27017';
      const opts = {
        ...defaultOpts,
        autoEncryption: { bypassAutoEncryption: false },
      };
      const mClientFirst = stubConstructor(FakeMongoClient);
      const mClientSecond = stubConstructor(FakeMongoClient);
      const mClientType = sinon.stub();
      const commandSpy = sinon.spy();
      mClientFirst.db.returns({
        admin: () =>
          ({
            command: (...args: any[]) => {
              commandSpy(...args);
              return { modules: ['enterprise'] };
            },
          }) as any,
      } as any);
      mClientType.onFirstCall().returns(mClientFirst);
      mClientType.onSecondCall().returns(mClientSecond);
      const result = await connectMongoClient(
        uri,
        opts,
        bus,
        mClientType as any,
      );
      const calls = mClientType.getCalls();
      expect(calls.length).to.equal(2);
      expect(calls[0].args).to.have.lengthOf(2);
      expect(calls[0].args[0]).to.equal(uri);
      expect(
        Object.keys(mClientType.getCalls()[0].args[1]).sort(),
      ).to.deep.equal([
        '__skipPingOnConnect',
        'allowPartialTrustChain',
        'ca',
        'lookup',
      ]);
      expect(commandSpy).to.have.been.calledOnceWithExactly({ buildInfo: 1 });
      expect(result.client).to.equal(mClientSecond);
    });

    it('errors when bypassAutoEncryption is falsy and not enterprise', async function () {
      const uri = 'localhost:27017';
      const opts = { ...defaultOpts, autoEncryption: {} };
      const mClientFirst = stubConstructor(FakeMongoClient);
      const mClientSecond = stubConstructor(FakeMongoClient);
      const mClientType = sinon.stub();
      const commandSpy = sinon.spy();
      mClientFirst.db.returns({
        admin: () =>
          ({
            command: (...args: any[]) => {
              commandSpy(...args);
              return { modules: [] };
            },
          }) as any,
      } as any);
      mClientType.onFirstCall().returns(mClientFirst);
      mClientType.onSecondCall().returns(mClientSecond);
      try {
        await connectMongoClient(uri, opts, bus, mClientType as any);
      } catch (e: any) {
        return expect(e.message.toLowerCase()).to.include(
          'automatic encryption',
        );
      }
      expect.fail('Failed to throw expected error');
    });

    it('errors when bypassAutoEncryption is falsy, missing modules', async function () {
      const uri = 'localhost:27017';
      const opts = { ...defaultOpts, autoEncryption: {} };
      const mClientFirst = stubConstructor(FakeMongoClient);
      const mClientSecond = stubConstructor(FakeMongoClient);
      const mClientType = sinon.stub();
      const commandSpy = sinon.spy();
      mClientFirst.db.returns({
        admin: () =>
          ({
            command: (...args: any[]) => {
              commandSpy(...args);
              return {};
            },
          }) as any,
      } as any);
      mClientType.onFirstCall().returns(mClientFirst);
      mClientType.onSecondCall().returns(mClientSecond);
      try {
        await connectMongoClient(uri, opts, bus, mClientType as any);
      } catch (e: any) {
        return expect(e.message.toLowerCase()).to.include(
          'automatic encryption',
        );
      }
      expect.fail('Failed to throw expected error');
    });

    it('connects once when bypassQueryAnalysis is true', async function () {
      const uri = 'localhost:27017';
      const opts = { autoEncryption: { bypassQueryAnalysis: true } };
      const mClient = stubConstructor(FakeMongoClient);
      const mClientType = sinon.stub().returns(mClient);
      mClient.connect.onFirstCall().resolves(mClient);
      const result = await connectMongoClient(
        uri,
        { ...defaultOpts, ...opts },
        bus,
        mClientType as any,
      );
      expect(mClientType.getCalls()).to.have.lengthOf(1);
      expect(mClientType.getCalls()[0].args).to.have.lengthOf(2);
      expect(mClientType.getCalls()[0].args[0]).to.equal(uri);
      expect(
        Object.keys(mClientType.getCalls()[0].args[1]).sort(),
      ).to.deep.equal([
        '__skipPingOnConnect',
        'allowPartialTrustChain',
        'autoEncryption',
        'ca',
        'lookup',
      ]);
      expect(mClient.connect.getCalls()).to.have.lengthOf(1);
      expect(result.client).to.equal(mClient);
    });

    it('connects twice when bypassQueryAnalysis is false and enterprise via modules', async function () {
      const uri = 'localhost:27017';
      const opts = {
        ...defaultOpts,
        autoEncryption: { bypassQueryAnalysis: false },
      };
      const mClientFirst = stubConstructor(FakeMongoClient);
      const mClientSecond = stubConstructor(FakeMongoClient);
      const mClientType = sinon.stub();
      const commandSpy = sinon.spy();
      mClientFirst.db.returns({
        admin: () =>
          ({
            command: (...args: any[]) => {
              commandSpy(...args);
              return { modules: ['enterprise'] };
            },
          }) as any,
      } as any);
      mClientType.onFirstCall().returns(mClientFirst);
      mClientType.onSecondCall().returns(mClientSecond);
      const result = await connectMongoClient(
        uri,
        opts,
        bus,
        mClientType as any,
      );
      const calls = mClientType.getCalls();
      expect(calls.length).to.equal(2);
      expect(mClientType.getCalls()[0].args).to.have.lengthOf(2);
      expect(mClientType.getCalls()[0].args[0]).to.equal(uri);
      expect(
        Object.keys(mClientType.getCalls()[0].args[1]).sort(),
      ).to.deep.equal([
        '__skipPingOnConnect',
        'allowPartialTrustChain',
        'ca',
        'lookup',
      ]);
      expect(commandSpy).to.have.been.calledOnceWithExactly({ buildInfo: 1 });
      expect(result.client).to.equal(mClientSecond);
    });

    it('errors when bypassQueryAnalysis is falsy and not enterprise', async function () {
      const uri = 'localhost:27017';
      const opts = { ...defaultOpts, autoEncryption: {} };
      const mClientFirst = stubConstructor(FakeMongoClient);
      const mClientSecond = stubConstructor(FakeMongoClient);
      const mClientType = sinon.stub();
      const commandSpy = sinon.spy();
      mClientFirst.db.returns({
        admin: () =>
          ({
            command: (...args: any[]) => {
              commandSpy(...args);
              return { modules: [] };
            },
          }) as any,
      } as any);
      mClientType.onFirstCall().returns(mClientFirst);
      mClientType.onSecondCall().returns(mClientSecond);
      try {
        await connectMongoClient(uri, opts, bus, mClientType as any);
      } catch (e: any) {
        return expect(e.message.toLowerCase()).to.include(
          'automatic encryption',
        );
      }
      expect.fail('Failed to throw expected error');
    });

    it('errors when bypassQueryAnalysis is falsy, missing modules', async function () {
      const uri = 'localhost:27017';
      const opts = { ...defaultOpts, autoEncryption: {} };
      const mClientFirst = stubConstructor(FakeMongoClient);
      const mClientSecond = stubConstructor(FakeMongoClient);
      const mClientType = sinon.stub();
      const commandSpy = sinon.spy();
      mClientFirst.db.returns({
        admin: () =>
          ({
            command: (...args: any[]) => {
              commandSpy(...args);
              return {};
            },
          }) as any,
      } as any);
      mClientType.onFirstCall().returns(mClientFirst);
      mClientType.onSecondCall().returns(mClientSecond);
      try {
        await connectMongoClient(uri, opts, bus, mClientType as any);
      } catch (e: any) {
        return expect(e.message.toLowerCase()).to.include(
          'automatic encryption',
        );
      }
      expect.fail('Failed to throw expected error');
    });

    it('fails fast if there is a fail-fast connection error', async function () {
      const err = Object.assign(new Error('ENOTFOUND'), {
        name: 'MongoNetworkError',
      });
      const uri = 'localhost:27017';
      const mClient = new FakeMongoClient();
      const mClientType = sinon.stub().returns(mClient);
      let rejectConnect: (err: Error) => void;
      const closeSpy = sinon.stub().callsFake(() => {
        rejectConnect(new Error('discarded error'));
      });
      mClient.close = closeSpy;
      mClient.connect = () =>
        new Promise((resolve, reject) => {
          rejectConnect = reject;
          setImmediate(() => {
            mClient.emit('serverHeartbeatFailed', {
              failure: err,
              connectionId: uri,
            });
          });
        });
      mClient.topology = {
        description: {
          servers: new Map([['localhost:27017', {}]]),
        },
      };
      try {
        await connectMongoClient(uri, defaultOpts, bus, mClientType as any);
      } catch (e) {
        expect((closeSpy as any).getCalls()).to.have.lengthOf(1);
        return expect(e).to.equal(err);
      }
      expect.fail('Failed to throw expected error');
    });

    it('connects once using the system CA', async function () {
      const uri = 'localhost:27017';
      const mClient = stubConstructor(FakeMongoClient);
      const mClientType = sinon.stub().returns(mClient);
      mClient.connect.onFirstCall().resolves(mClient);
      const result = await connectMongoClient(
        uri,
        defaultOpts,
        bus,
        mClientType as any,
      );
      expect(mClientType.getCalls()).to.have.lengthOf(1);
      expect(mClientType.getCalls()[0].args[1].ca).to.be.a('string');
      expect(mClientType.getCalls()[0].args[1].ca).to.include(
        '-----BEGIN CERTIFICATE-----',
      );
      expect(mClient.connect.getCalls()).to.have.lengthOf(1);
      expect(result.client).to.equal(mClient);
    });

    it('allows useSystemCA to be configured to false', async function () {
      const uri = 'localhost:27017';
      const mClient = stubConstructor(FakeMongoClient);
      const mClientType = sinon.stub().returns(mClient);
      mClient.connect.onFirstCall().resolves(mClient);
      const result = await connectMongoClient(
        uri,
        { ...defaultOpts, useSystemCA: false },
        bus,
        mClientType as any,
      );
      expect(mClientType.getCalls()).to.have.lengthOf(1);
      expect(mClientType.getCalls()[0].args[1].ca).to.equal(undefined);
      expect(mClient.connect.getCalls()).to.have.lengthOf(1);
      expect(result.client).to.equal(mClient);
    });

    it('allows useSystemCA to be configured to true', async function () {
      const uri = 'localhost:27017';
      const mClient = stubConstructor(FakeMongoClient);
      const mClientType = sinon.stub().returns(mClient);
      mClient.connect.onFirstCall().resolves(mClient);
      const result = await connectMongoClient(
        uri,
        { ...defaultOpts, useSystemCA: true },
        bus,
        mClientType as any,
      );
      expect(mClientType.getCalls()).to.have.lengthOf(1);
      expect(mClientType.getCalls()[0].args[1].ca).to.be.a('string');
      expect(mClientType.getCalls()[0].args[1].ca).to.include(
        '-----BEGIN CERTIFICATE-----',
      );
      expect(mClient.connect.getCalls()).to.have.lengthOf(1);
      expect(result.client).to.equal(mClient);
    });

    it('allows lookup to be configured', async function () {
      const uri = 'localhost:27017';
      const mClient = stubConstructor(FakeMongoClient);
      const mClientType = sinon.stub().returns(mClient);
      mClient.connect.onFirstCall().resolves(mClient);
      const lookupSpy = sinon.spy();
      await connectMongoClient(
        uri,
        { ...defaultOpts, useSystemCA: false, lookup: lookupSpy },
        bus,
        mClientType as any,
      );

      // get options passed to mongo client
      const finalClientOptions = mClientType.getCalls()[0].args[1];
      expect(finalClientOptions.lookup).to.not.equal(lookupSpy); // lookup is always wrapped
      finalClientOptions.lookup('localhost', 27017, () => {}); // invoke it the way it would be by net/tls
      expect(lookupSpy.getCalls()).to.have.lengthOf(1); // verify our input lookup was called instead of the dns package
      expect(lookupSpy.getCalls()[0].args[1]).to.have.property(
        'verbatim',
        false,
      ); // but we still always set verbatim to false
    });

    describe('retryable TLS errors', function () {
      it('retries TLS errors without system CA integration enabled -- MongoClient error', async function () {
        const uri = 'localhost:27017';
        const mClient = new FakeMongoClient();
        const mClientType = sinon.stub().returns(mClient);
        const failure = new (Error as any)('blahblah', {
          cause: Object.assign(new Error('self-signed cert'), {
            code: 'SELF_SIGNED_CERT_IN_CHAIN',
          }),
        });
        let earlyFailures = 0;
        bus.on('devtools-connect:connect-fail-early', () => earlyFailures++);

        mClient.connect = sinon.stub().callsFake(async () => {
          await new Promise(setImmediate);
          mClient.emit('serverHeartbeatFailed', {
            failure,
            connectionId: uri,
          });
          await new Promise(setImmediate);
          throw failure;
        });
        mClient.topology = {
          description: {
            servers: new Map([['localhost:27017', {}]]),
          },
        };

        try {
          await connectMongoClient(uri, defaultOpts, bus, mClientType as any);
          expect.fail('missed exception');
        } catch (err) {
          expect(err).to.equal(failure);
        }

        expect(mClientType.getCalls()).to.have.lengthOf(2);
        expect(
          Object.keys(mClientType.getCalls()[0].args[1]).sort(),
        ).to.deep.equal([
          '__skipPingOnConnect',
          'allowPartialTrustChain',
          'ca',
          'lookup',
        ]);
        expect(
          Object.keys(mClientType.getCalls()[1].args[1]).sort(),
        ).to.deep.equal([
          '__skipPingOnConnect',
          'allowPartialTrustChain',
          'lookup',
        ]);
        expect((mClient as any).connect.getCalls()).to.have.lengthOf(2);

        expect(earlyFailures).to.equal(2);
      });

      it('retries TLS errors without system CA integration enabled -- OIDC error', async function () {
        const uri = 'localhost:27017';
        const mClient = new FakeMongoClient();
        let opts: DevtoolsConnectOptions;

        const proxyConnectEvents: any[] = [];
        bus.on('proxy:connect', (ev) => {
          proxyConnectEvents.push({ ...ev, opts: { ...ev.opts } });
          ev.opts.ca = 'abcdef'; // will always fail
          ev.agent.httpsAgent = new HTTPSAgent({ ca: 'abcdef' });
        });
        const mClientType = sinon.stub().callsFake((url, clientOpts) => {
          opts = clientOpts;
          return mClient;
        });

        mClient.connect = sinon.stub().callsFake(async () => {
          return await opts.authMechanismProperties?.OIDC_HUMAN_CALLBACK?.({
            version: 1,
            timeoutContext: new AbortController().signal,
            idpInfo: {
              issuer: 'https://mongodb.com/',
              clientId: 'meow',
            },
          });
        });
        mClient.topology = {
          description: {
            servers: new Map([['localhost:27017', {}]]),
          },
        };

        try {
          await connectMongoClient(
            uri,
            {
              ...defaultOpts,
              authMechanism: 'MONGODB-OIDC',
            },
            bus,
            mClientType as any,
          );
          expect.fail('missed exception');
        } catch (err: any) {
          expect(err.message).to.include('Unable to fetch issuer metadata');
        }

        expect(mClientType.getCalls()).to.have.lengthOf(2);
        expect((mClient as any).connect.getCalls()).to.have.lengthOf(2);
        expect(proxyConnectEvents).to.have.lengthOf(2);
        expect(proxyConnectEvents[0].agent).to.not.equal(
          proxyConnectEvents[1].agent,
        );
        expect(proxyConnectEvents[0].opts.ca).to.not.equal(
          proxyConnectEvents[1].opts.ca,
        );
        expect(proxyConnectEvents[0].agent.proxyOptions.ca).to.not.equal(
          proxyConnectEvents[1].agent.proxyOptions.ca,
        );
      });
    });
  });

  describe('integration', function () {
    let cluster: MongoCluster;

    before(async function () {
      this.timeout(180_000);

      cluster = await MongoCluster.start({
        tmpDir: tmpdir(),
        topology: 'standalone',
      });
    });

    after(async function () {
      await cluster?.close();
    });

    for (const [name, versionRe, Client] of [
      ['6.x driver', /^6\.\d+\.\d+$/, MongoClient6],
      ['7.x driver', /^7\.\d+\.\d+$/, MongoClient],
    ] as const) {
      it(`successfully connects to mongod service (${name})`, async function () {
        const bus = new EventEmitter();
        const initEvent = once(
          bus,
          'devtools-connect:connect-attempt-initialized',
        );
        const { client } = await connectMongoClient(
          cluster.connectionString,
          defaultOpts,
          bus,
          Client as typeof MongoClient,
        );
        expect((await client.db('admin').command({ ping: 1 })).ok).to.equal(1);
        const [connectionAttemptMetadata] = await initEvent;
        expect(connectionAttemptMetadata.driver.name).to.equal('nodejs');
        expect(connectionAttemptMetadata.driver.version).to.match(versionRe);

        const onCloseStub = sinon.stub();
        client.on('close', onCloseStub);
        await client.close();
        expect(onCloseStub.getCalls()).to.have.lengthOf(1);
      });
    }
  });

  describe('atlas', function () {
    it('shows an error reminding the user to ensure that their network access list allows connections from their ip', async function () {
      const uri =
        'mongodb://compass-data-sets-shard-00-00.e06dc.mongodb.net/?connectTimeoutMS=1&serverSelectionTimeoutMS=1';
      const bus = new EventEmitter();
      try {
        await connectMongoClient(uri, defaultOpts, bus, MongoClient);
      } catch (e: any) {
        return expect(e.message.toLowerCase()).to.include(
          'it looks like this is a mongodb atlas cluster',
        );
      }
      expect.fail('Failed to throw expected error');
    });
  });

  describe('isHumanOidcFlow', function () {
    it('returns false by default', function () {
      expect(isHumanOidcFlow('mongodb://example/', {})).to.equal(false);
    });

    it('returns true if the authMechanism is MONGODB-OIDC', function () {
      expect(
        isHumanOidcFlow('mongodb://example/?authMechanism=MONGODB-OIDC', {}),
      ).to.equal(true);
    });

    it('returns false if the ENVIRONMENT JS option is set', function () {
      expect(
        isHumanOidcFlow('mongodb://example/?authMechanism=MONGODB-OIDC', {
          authMechanismProperties: {
            ENVIRONMENT: 'azure',
          },
        }),
      ).to.equal(false);
    });

    it('returns false if the OIDC_CALLBACK is set', function () {
      expect(
        isHumanOidcFlow('mongodb://example/?authMechanism=MONGODB-OIDC', {
          authMechanismProperties: {
            OIDC_CALLBACK: () => Promise.resolve({ accessToken: 'abc123' }),
          },
        }),
      ).to.equal(false);
    });

    it('returns false if the ENVIRONMENT url option is set', function () {
      expect(
        isHumanOidcFlow(
          'mongodb://example/?authMechanism=MONGODB-OIDC&authMechanismProperties=ENVIRONMENT:azure',
          {},
        ),
      ).to.equal(false);
    });
  });
});
