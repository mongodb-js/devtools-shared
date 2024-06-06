import chai, { expect } from 'chai';
import { PassThrough } from 'stream';
import sinon from 'ts-sinon';
import {
  sign,
  readSignedStream,
  RpcServer,
  RpcClient,
  StateShareServer,
  StateShareClient,
} from './ipc-rpc-state-share';
import sinonChai from 'sinon-chai';
import type { DevtoolsConnectionState } from './connect';
chai.use(sinonChai);

describe('IPC RPC state sharing', function () {
  describe('signed content sharing', function () {
    it('can be used to compose and verify hmac-signed messages', async function () {
      const data = 'hello world';
      const hmacKey = Buffer.from('foobar');
      const signature = sign(data, hmacKey);
      const stream = new PassThrough();
      stream.end(data);
      const result = await readSignedStream(stream, signature, hmacKey);
      expect(result).to.equal(data);
    });

    it('rejects content signed with an invalid hmac key', async function () {
      const data = 'hello world';
      const signature = sign(data, Buffer.from('foobar'));
      const stream = new PassThrough();
      stream.end(data);
      try {
        await readSignedStream(stream, signature, Buffer.from('somethingelse'));
        expect.fail('missed exception');
      } catch (err: any) {
        expect(err.message).to.include('Signature mismatch');
      }
    });

    it('rejects content signed with an invalid signature', async function () {
      const data = 'hello world';
      const hmacKey = Buffer.from('foobar');
      const stream = new PassThrough();
      stream.end(data);
      try {
        await readSignedStream(stream, 'somethingelse', hmacKey);
        expect.fail('missed exception');
      } catch (err: any) {
        expect(err.message).to.include('Signature mismatch');
      }
    });
  });

  describe('RpcServer/RpcClient', function () {
    let rpcServer: RpcServer;
    let ExampleServer: typeof RpcServer & { create(): Promise<RpcServer> };
    let handleRpcStub: sinon.SinonStub;

    beforeEach(function () {
      handleRpcStub = sinon.stub();
      ExampleServer = class ExampleServer extends RpcServer {
        handleRpc = handleRpcStub;

        static async create() {
          const instance = new this('example');
          await instance._init();
          return instance;
        }
      };
    });

    afterEach(async function () {
      await rpcServer?.close();
    });

    it('allows communication over a local socket', async function () {
      handleRpcStub.resolves({
        cat: 'meow',
      });

      rpcServer = await ExampleServer.create();
      const rpcClient = new RpcClient(rpcServer.handle);
      const result = await rpcClient.makeRpcCall({ foo: 'bar' });
      expect(result).to.deep.equal({ status: 200, cat: 'meow' });
      expect(handleRpcStub).to.have.been.calledWith({ foo: 'bar' });
    });

    it('forwards errors from the handler', async function () {
      handleRpcStub.rejects(new Error('something bad happened'));

      rpcServer = await ExampleServer.create();
      const rpcClient = new RpcClient(rpcServer.handle);
      try {
        await rpcClient.makeRpcCall({ foo: 'bar' });
        expect.fail('missed exception');
      } catch (err: any) {
        expect(err.message).to.equal('something bad happened');
      }
    });
  });

  describe('StateShareServer/StateShareClient', function () {
    let fakeState: DevtoolsConnectionState;
    let callback: sinon.SinonStub;
    let server: StateShareServer;
    let client: StateShareClient;

    beforeEach(function () {
      callback = sinon.stub();
      fakeState = {
        productName: 'MongoDB Something',
        oidcPlugin: {
          mongoClientOptions: {
            authMechanismProperties: {
              OIDC_HUMAN_CALLBACK: callback,
            },
          },
        },
      } as unknown as DevtoolsConnectionState;
    });

    afterEach(async function () {
      await server.close();
    });

    it('can be used to share OIDC state', async function () {
      callback.resolves({ accessToken: 'req-accesstoken' });
      server = await StateShareServer.create(fakeState);
      client = new StateShareClient(server.handle);
      const result =
        await client.oidcPlugin.mongoClientOptions.authMechanismProperties.OIDC_HUMAN_CALLBACK(
          {
            idpInfo: {
              issuer: 'http://localhost/',
              clientId: 'clientId',
            },
            version: 1,
          }
        );
      expect(result).to.deep.equal({ accessToken: 'req-accesstoken' });
    });

    it('supports timeoutContext', async function () {
      callback.callsFake((params: { timeoutContext: AbortSignal }) => {
        return new Promise((resolve, reject) =>
          params.timeoutContext.addEventListener('abort', () =>
            reject(new Error('aborted'))
          )
        );
      });
      server = await StateShareServer.create(fakeState);
      client = new StateShareClient(server.handle);

      const abortController = new AbortController();
      const result =
        client.oidcPlugin.mongoClientOptions.authMechanismProperties.OIDC_HUMAN_CALLBACK(
          {
            idpInfo: {
              issuer: 'http://localhost/',
              clientId: 'clientId',
            },
            version: 1,
            timeoutContext: abortController.signal,
          }
        );
      setTimeout(() => abortController.abort(), 100);
      try {
        await result;
        expect.fail('missed exception');
      } catch (err: any) {
        expect(err.message).to.equal('aborted');
      }
    });
  });
});
