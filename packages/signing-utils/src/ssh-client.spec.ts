import sinon from 'sinon';
import { SSHClient } from './ssh-client';
import { expect } from 'chai';
import { PassThrough } from 'stream';
import { promisify } from 'util';

describe('SSHClient', function () {
  let sshClient: SSHClient;
  let sandbox: sinon.SinonSandbox;

  beforeEach(function () {
    const sshClientOptions = {
      host: 'example.com',
      port: 22,
      username: 'admin',
    };
    sshClient = new SSHClient(sshClientOptions);
    sandbox = sinon.createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('connect()', function () {
    let connectStub: sinon.SinonStub;

    beforeEach(function () {
      connectStub = sandbox
        .stub(sshClient['sshConnection'], 'connect')
        .returns(sshClient['sshConnection']);
    });
    it('connects successfully on ready', async function () {
      const connectPromise = sshClient.connect();
      sshClient['sshConnection'].emit('ready');
      await connectPromise;

      expect(connectStub.calledOnce).to.be.true;
      expect(connectStub.firstCall.firstArg).to.deep.equal({
        host: 'example.com',
        port: 22,
        username: 'admin',
        privateKey: undefined,
      });
      expect(sshClient).to.have.property('connected', true);
    });

    it('does not called client.connect when connected', async function () {
      // connect the internal ssh client
      sshClient['sshConnection'].emit('ready');

      const connectPromise = sshClient.connect();
      sshClient['sshConnection'].emit('ready');
      await connectPromise;

      expect(connectStub.calledOnce).to.be.false;
      expect(sshClient).to.have.property('connected', true);
    });

    it('throws when connecting on error', async function () {
      const connectPromise = sshClient.connect();
      sshClient['sshConnection'].emit('error', new Error('Connection error'));

      const error = await connectPromise.catch((e) => e);
      expect(error).to.have.property('message', 'Connection error');
      expect(connectStub.calledOnce).to.be.true;
      expect(connectStub.firstCall.firstArg).to.deep.equal({
        host: 'example.com',
        port: 22,
        username: 'admin',
        privateKey: undefined,
      });
      expect(sshClient).to.have.property('connected', false);
    });
  });

  describe('disconnect()', function () {
    it('disconnects from SSH server', function () {
      const endStub = sandbox.stub(sshClient['sshConnection'], 'end');
      sshClient['sshConnection'].emit('ready');

      sshClient.disconnect();
      expect(endStub.calledOnce).to.be.true;
    });
  });

  describe('exec()', function () {
    const COMMAND = 'echo "Hello World"';
    function makeMockClientChannel() {
      const stream: PassThrough & { stderr: PassThrough } =
        new PassThrough() as any;
      stream.stderr = new PassThrough();
      return stream;
    }
    let clientStream: ReturnType<typeof makeMockClientChannel>;
    let execStub;

    beforeEach(function () {
      clientStream = makeMockClientChannel();
      execStub = sandbox
        .stub(sshClient['sshConnection'], 'exec')
        .yieldsRight(undefined, clientStream);
      sshClient['sshConnection'].emit('ready');
    });

    it('should throw when exec fails', async function () {
      execStub.yieldsRight(new Error('Callback Error'));

      sshClient['sshConnection'].emit('ready');

      const err = await sshClient.exec(COMMAND).catch((e) => e);

      expect(err).to.have.property('message', 'Callback Error');
      expect(execStub.calledOnce).to.be.true;
      expect(execStub.firstCall.firstArg).to.equal(COMMAND);
    });

    it('should throw when exec returns an error - code > 0', async function () {
      const resultPromise = sshClient.exec(COMMAND);
      // internally, exec() attaches event listeners to the `stream` after an `await` statement
      // so we must queue a microtask to let the `exec` function resume  before emitting events
      // on the stream.  otherwise, the events are emitted from the stream when there are no
      // listeners on the stream.
      await promisify(queueMicrotask)();
      clientStream.stderr.push('Some Error');
      clientStream.emit('close', 10);

      const error = await resultPromise.catch((e) => e);
      expect(error).to.have.a.property(
        'message',
        'Command failed with code 10. Error: Some Error'
      );
      expect(execStub.calledOnce).to.be.true;
      expect(execStub.firstCall.firstArg).to.equal(COMMAND);
    });

    it('should return stdout when exec succeeds', async function () {
      const resultPromise = sshClient.exec(COMMAND);
      // internally, exec() attaches event listeners to the `stream` after an `await` statement
      // so we must queue a microtask to let the `exec` function resume  before emitting events
      // on the stream.  otherwise, the events are emitted from the stream when there are no
      // listeners on the stream.
      await promisify(queueMicrotask)();
      clientStream.push('Hello World');
      clientStream.emit('close', 0);
      const result = await resultPromise;
      expect(result).to.equal('Hello World');
      expect(execStub.calledOnce).to.be.true;
      expect(execStub.firstCall.firstArg).to.equal(COMMAND);
    });
  });

  describe('getSftpConnection()', function () {
    describe('when the ssh client is not connected', function () {
      it('returns the sftp connection', async function () {
        const error = await sshClient.getSftpConnection().catch((e) => e);
        expect(error)
          .to.be.instanceof(Error)
          .to.match(/Not connected to ssh server/);
      });
    });

    describe('when the ssh client is connected', function () {
      let connectionStub: sinon.SinonStub;
      beforeEach(function () {
        connectionStub = sandbox
          .stub(sshClient['sshConnection'], 'sftp')
          .yieldsRight(undefined, 'mockedSFTP');

        sshClient['sshConnection'].emit('ready');
      });
      it('returns the sftp connection', async function () {
        const connection = await sshClient.getSftpConnection();
        expect(connection).to.equal('mockedSFTP');
      });

      it('caches the sftp connection', async function () {
        await sshClient.getSftpConnection();
        connectionStub.yieldsRight(undefined, 'new value');

        const connection = await sshClient.getSftpConnection();
        expect(connection).to.equal('mockedSFTP');
      });
    });
  });
});
