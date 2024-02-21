import { connectMongoClient } from './';
import type { DevtoolsConnectOptions } from './';
import { isHumanOidcFlow } from './connect';
import { EventEmitter } from 'events';
import { MongoClient } from 'mongodb';
import sinon, { stubConstructor } from 'ts-sinon';
import chai, { expect } from 'chai';
import sinonChai from 'sinon-chai';

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
        mClientType as any
      );
      expect(mClientType.getCalls()).to.have.lengthOf(1);
      expect(mClientType.getCalls()[0].args).to.have.lengthOf(2);
      expect(mClientType.getCalls()[0].args[0]).to.equal(uri);
      expect(Object.keys(mClientType.getCalls()[0].args[1])).to.have.lengthOf(
        1
      );
      expect(mClientType.getCalls()[0].args[1]).to.have.property('lookup');
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
        mClientType as any
      );
      expect(mClientType.getCalls()).to.have.lengthOf(1);
      expect(mClientType.getCalls()[0].args).to.have.lengthOf(2);
      expect(mClientType.getCalls()[0].args[0]).to.equal(uri);
      expect(Object.keys(mClientType.getCalls()[0].args[1])).to.have.lengthOf(
        2
      );
      expect(mClientType.getCalls()[0].args[1].autoEncryption).to.deep.equal(
        opts.autoEncryption
      );
      expect(mClientType.getCalls()[0].args[1]).to.have.property('lookup');
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
          } as any),
      } as any);
      mClientType.onFirstCall().returns(mClientFirst);
      mClientType.onSecondCall().returns(mClientSecond);
      const result = await connectMongoClient(
        uri,
        opts,
        bus,
        mClientType as any
      );
      const calls = mClientType.getCalls();
      expect(calls.length).to.equal(2);
      expect(calls[0].args).to.have.lengthOf(2);
      expect(calls[0].args[0]).to.equal(uri);
      expect(Object.keys(calls[0].args[1])).to.have.lengthOf(1);
      expect(calls[0].args[1]).to.have.property('lookup');
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
          } as any),
      } as any);
      mClientType.onFirstCall().returns(mClientFirst);
      mClientType.onSecondCall().returns(mClientSecond);
      try {
        await connectMongoClient(uri, opts, bus, mClientType as any);
      } catch (e: any) {
        return expect(e.message.toLowerCase()).to.include(
          'automatic encryption'
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
          } as any),
      } as any);
      mClientType.onFirstCall().returns(mClientFirst);
      mClientType.onSecondCall().returns(mClientSecond);
      try {
        await connectMongoClient(uri, opts, bus, mClientType as any);
      } catch (e: any) {
        return expect(e.message.toLowerCase()).to.include(
          'automatic encryption'
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
        mClientType as any
      );
      expect(mClientType.getCalls()).to.have.lengthOf(1);
      expect(mClientType.getCalls()[0].args).to.have.lengthOf(2);
      expect(mClientType.getCalls()[0].args[0]).to.equal(uri);
      expect(Object.keys(mClientType.getCalls()[0].args[1])).to.have.lengthOf(
        2
      );
      expect(mClientType.getCalls()[0].args[1].autoEncryption).to.deep.equal(
        opts.autoEncryption
      );
      expect(mClientType.getCalls()[0].args[1]).to.have.property('lookup');
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
          } as any),
      } as any);
      mClientType.onFirstCall().returns(mClientFirst);
      mClientType.onSecondCall().returns(mClientSecond);
      const result = await connectMongoClient(
        uri,
        opts,
        bus,
        mClientType as any
      );
      const calls = mClientType.getCalls();
      expect(calls.length).to.equal(2);
      expect(mClientType.getCalls()[0].args).to.have.lengthOf(2);
      expect(mClientType.getCalls()[0].args[0]).to.equal(uri);
      expect(Object.keys(mClientType.getCalls()[0].args[1])).to.have.lengthOf(
        1
      );
      expect(mClientType.getCalls()[0].args[1]).to.have.property('lookup');
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
          } as any),
      } as any);
      mClientType.onFirstCall().returns(mClientFirst);
      mClientType.onSecondCall().returns(mClientSecond);
      try {
        await connectMongoClient(uri, opts, bus, mClientType as any);
      } catch (e: any) {
        return expect(e.message.toLowerCase()).to.include(
          'automatic encryption'
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
          } as any),
      } as any);
      mClientType.onFirstCall().returns(mClientFirst);
      mClientType.onSecondCall().returns(mClientSecond);
      try {
        await connectMongoClient(uri, opts, bus, mClientType as any);
      } catch (e: any) {
        return expect(e.message.toLowerCase()).to.include(
          'automatic encryption'
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

    it('connects once when using the system CA has been requested', async function () {
      this.timeout(30_000); // useSystemCA is slow on Windows
      const uri = 'localhost:27017';
      const mClient = stubConstructor(FakeMongoClient);
      const mClientType = sinon.stub().returns(mClient);
      mClient.connect.onFirstCall().resolves(mClient);
      const result = await connectMongoClient(
        uri,
        { ...defaultOpts, useSystemCA: true },
        bus,
        mClientType as any
      );
      expect(mClientType.getCalls()).to.have.lengthOf(1);
      expect(mClientType.getCalls()[0].args[1].ca).to.be.a('string');
      expect(mClientType.getCalls()[0].args[1].ca).to.include(
        '-----BEGIN CERTIFICATE-----'
      );
      expect(mClientType.getCalls()[0].args[1]).to.not.have.property(
        'useSystemCA'
      );
      expect(mClient.connect.getCalls()).to.have.lengthOf(1);
      expect(result.client).to.equal(mClient);
    });

    it('does not pass useSystemCA: false to the driver', async function () {
      const uri = 'localhost:27017';
      const mClient = stubConstructor(FakeMongoClient);
      const mClientType = sinon.stub().returns(mClient);
      mClient.connect.onFirstCall().resolves(mClient);
      const result = await connectMongoClient(
        uri,
        { ...defaultOpts, useSystemCA: false },
        bus,
        mClientType as any
      );
      expect(mClientType.getCalls()).to.have.lengthOf(1);
      expect(mClientType.getCalls()[0].args[1]).to.not.have.property(
        'useSystemCA'
      );
      expect(mClientType.getCalls()[0].args[1]).to.have.property('lookup');
      expect(mClient.connect.getCalls()).to.have.lengthOf(1);
      expect(result.client).to.equal(mClient);
    });
  });

  describe('integration', function () {
    before(function () {
      if (!process.env.MONGODB_URI) {
        this.skip();
      }
    });

    it('successfully connects to mongod service', async function () {
      const bus = new EventEmitter();
      const { client } = await connectMongoClient(
        process.env.MONGODB_URI ?? '',
        defaultOpts,
        bus,
        MongoClient
      );
      expect((await client.db('admin').command({ ping: 1 })).ok).to.equal(1);

      const onCloseStub = sinon.stub();
      client.on('close', onCloseStub);
      await client.close();
      expect(onCloseStub.getCalls()).to.have.lengthOf(1);
    });
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
          'it looks like this is a mongodb atlas cluster'
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
        isHumanOidcFlow('mongodb://example/?authMechanism=MONGODB-OIDC', {})
      ).to.equal(true);
    });

    it('returns false if the PROVIDER_NAME JS option is set', function () {
      expect(
        isHumanOidcFlow('mongodb://example/?authMechanism=MONGODB-OIDC', {
          authMechanismProperties: {
            PROVIDER_NAME: 'aws',
          },
        })
      ).to.equal(false);
    });

    it('returns false if the PROVIDER_NAME url option is set', function () {
      expect(
        isHumanOidcFlow(
          'mongodb://example/?authMechanism=MONGODB-OIDC&authMechanismProperties=PROVIDER_NAME:aws',
          {}
        )
      ).to.equal(false);
    });
  });
});
