import { EventEmitter, once } from 'events';
import { HTTPServerProxyTestSetup } from '../test/helpers';
import { SSHAgent } from './ssh';
import { createFetch } from './fetch';
import { expect } from 'chai';
import sinon from 'sinon';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { utils as ssh2Utils } from 'ssh2';

describe('SSHAgent', function () {
  let setup: HTTPServerProxyTestSetup;
  let agent: SSHAgent | undefined;

  beforeEach(async function () {
    setup = new HTTPServerProxyTestSetup();
    await setup.listen();
    agent = undefined;
  });

  afterEach(async function () {
    await setup.teardown();
    agent?.destroy();
  });

  it('allows establishing connections through an SSH server', async function () {
    agent = new SSHAgent({
      proxy: `ssh://someuser@127.0.0.1:${setup.sshProxyPort}/`,
    });
    const fetch = createFetch(agent);
    const response = await fetch('http://example.com/hello');
    expect(await response.text()).to.equal('OK /hello');
  });

  it('re-uses a single SSH connection if it can', async function () {
    setup.authHandler = sinon.stub().returns(true);
    agent = new SSHAgent({
      proxy: `ssh://foo:bar@127.0.0.1:${setup.sshProxyPort}/`,
    });
    const fetch = createFetch(agent);
    await Promise.all([
      fetch('http://example.com/hello'),
      fetch('http://example.com/hello'),
    ]);
    expect(setup.authHandler).to.have.been.calledOnceWith('foo', 'bar');
  });

  it('handles special characters in username and password', async function () {
    setup.authHandler = sinon.stub().returns(true);
    agent = new SSHAgent({
      proxy: `ssh://foo%5E:ba%26r@127.0.0.1:${setup.sshProxyPort}/`,
    });
    const fetch = createFetch(agent);
    await Promise.all([
      fetch('http://example.com/hello'),
      fetch('http://example.com/hello'),
    ]);
    expect(setup.authHandler).to.have.been.calledOnceWith('foo^', 'ba&r');
  });

  it('allows explicitly initializing the connection', async function () {
    setup.authHandler = sinon.stub().returns(true);
    agent = new SSHAgent({
      proxy: `ssh://foo:bar@127.0.0.1:${setup.sshProxyPort}/`,
    });
    await agent.initialize();
    await createFetch(agent)('http://example.com/hello');
    expect(setup.authHandler).to.have.been.calledOnceWith('foo', 'bar');
  });

  it('automatically reconnects if a connection was broken', async function () {
    setup.authHandler = sinon.stub().returns(true);
    agent = new SSHAgent({
      proxy: `ssh://foo:bar@127.0.0.1:${setup.sshProxyPort}/`,
    });
    await agent.initialize();
    const fetch = createFetch(agent);
    await fetch('http://example.com/hello');
    await agent.interruptForTesting();
    await fetch('http://example.com/hello');
    expect(setup.authHandler).to.have.been.calledTwice;
  });

  it('does not reconnect if the agent was intentionally closed', async function () {
    setup.authHandler = sinon.stub().returns(true);
    agent = new SSHAgent({
      proxy: `ssh://foo:bar@127.0.0.1:${setup.sshProxyPort}/`,
    });
    await agent.initialize();
    const fetch = createFetch(agent);
    await fetch('http://example.com/hello');
    agent.destroy();
    try {
      await fetch('http://example.com/hello');
      expect.fail('missed exception');
    } catch (err) {
      expect(err.message).to.include(
        'request to http://example.com/hello failed, reason: Disconnected',
      );
    }
    expect(setup.authHandler).to.have.been.calledOnce;
  });

  it('automatically retries the forwarding operation once (connection lost)', async function () {
    setup.authHandler = sinon.stub().returns(true);
    agent = new SSHAgent({
      proxy: `ssh://foo:bar@127.0.0.1:${setup.sshProxyPort}/`,
    });
    await agent.initialize();
    await agent.interruptForTesting();
    const fetch = createFetch(agent);
    await fetch('http://example.com/hello');
    expect(setup.authHandler).to.have.been.calledTwice;
  });

  it('automatically retries the forwarding operation once (tunnel failure)', async function () {
    setup.authHandler = sinon.stub().returns(true);
    setup.canTunnel = sinon
      .stub()
      .onFirstCall()
      .returns(false)
      .onSecondCall()
      .returns(true);
    agent = new SSHAgent({
      proxy: `ssh://foo:bar@127.0.0.1:${setup.sshProxyPort}/`,
    });
    const fetch = createFetch(agent);
    await fetch('http://example.com/hello');
    expect(setup.authHandler).to.have.been.calledTwice;
    expect(setup.canTunnel).to.have.been.calledTwice;
  });

  it('does not crash on unexpected sshClient error events', async function () {
    agent = new SSHAgent({
      proxy: `ssh://foo:bar@127.0.0.1:${setup.sshProxyPort}/`,
    });
    await agent.initialize();
    expect(() => {
      (agent as any).sshClient.emit(
        'error',
        new Error('some unexpected ssh error'),
      );
    }).not.to.throw();
    expect((agent as any).connected).to.be.false;
  });

  it('reconnects with a fresh SSH client after "Instance unusable after fatal error"', async function () {
    setup.authHandler = sinon.stub().returns(true);
    agent = new SSHAgent({
      proxy: `ssh://foo:bar@127.0.0.1:${setup.sshProxyPort}/`,
    });
    await agent.initialize();
    const fetch = createFetch(agent);
    await fetch('http://example.com/hello');

    // Simulate the ssh2 client entering an unrecoverable "unusable" state
    // (e.g. the TCP connection was killed mid-stream during hibernate). When
    // connect() is called on such a client, ssh2 emits 'error' instead of
    // 'ready', which our new createSshClient() path must handle by discarding
    // the broken instance and creating a fresh one.
    const brokenClient = (agent as any).sshClient;
    brokenClient.connect = function () {
      process.nextTick(() =>
        brokenClient.emit(
          'error',
          new Error('Instance unusable after fatal error'),
        ),
      );
    };
    (agent as any).connected = false;

    await fetch('http://example.com/hello');
    // A fresh client was created and a new SSH handshake performed
    expect(setup.authHandler).to.have.been.calledTwice;
  });

  it('serializes concurrent reinit attempts, creating only one new SSH connection', async function () {
    setup.authHandler = sinon.stub().returns(true);
    agent = new SSHAgent({
      proxy: `ssh://foo:bar@127.0.0.1:${setup.sshProxyPort}/`,
    });
    await agent.initialize();
    const fetch = createFetch(agent);
    await fetch('http://example.com/hello');

    // Force the current client into a fatal state so every concurrent _connect
    // call will need to reinitialize.
    const brokenClient = (agent as any).sshClient;
    brokenClient.connect = function () {
      process.nextTick(() =>
        brokenClient.emit(
          'error',
          new Error('Instance unusable after fatal error'),
        ),
      );
    };
    (agent as any).connected = false;

    // Three requests in flight at the same moment, all requiring a reinit.
    await Promise.all([
      fetch('http://example.com/hello'),
      fetch('http://example.com/hello'),
      fetch('http://example.com/hello'),
    ]);

    // Despite three concurrent requests, only one new SSH handshake should occur.
    expect(setup.authHandler).to.have.been.calledTwice;
  });

  context('after too many consecutive reinit failures', function () {
    let clock: sinon.SinonFakeTimers | undefined;

    afterEach(function () {
      clock?.restore();
      clock = undefined;
    });

    // Simulates a bastion that is unreachable after a long hibernate.
    function stubUnreachableBastion(a: SSHAgent): sinon.SinonStub {
      const stub = sinon.stub(a as any, 'createSshClient').callsFake(() => {
        const client = new EventEmitter() as any;
        client.connect = () => {
          process.nextTick(() =>
            client.emit('error', new Error('Connection refused')),
          );
        };
        client.end = () => {};
        client.destroy = () => {};
        return client;
      });
      (a as any).connected = false;
      return stub;
    }

    async function tripCircuitBreaker(a: SSHAgent): Promise<void> {
      for (let i = 0; i < 3; i++) {
        await a.initialize(true).catch(() => {});
      }
    }

    it('stops attempting new connections and reports why', async function () {
      setup.authHandler = sinon.stub().returns(true);
      agent = new SSHAgent({
        proxy: `ssh://foo:bar@127.0.0.1:${setup.sshProxyPort}/`,
      });
      await agent.initialize();
      stubUnreachableBastion(agent);
      await tripCircuitBreaker(agent);

      const establishingEvents: unknown[] = [];
      agent.logger.on('ssh:establishing-conection', (e: unknown) =>
        establishingEvents.push(e),
      );
      try {
        await agent.initialize();
        expect.fail('missed exception');
      } catch (err: any) {
        expect(err.message).to.include('repeated reconnection failures');
        expect(err.message).to.include('Connection refused');
        expect(err.message).not.to.equal('Disconnected.');
      }
      expect(establishingEvents).to.have.length(0);
      expect(setup.authHandler).to.have.been.calledOnce;
    });

    it('recovers once the cooldown has elapsed and the bastion is reachable', async function () {
      setup.authHandler = sinon.stub().returns(true);
      agent = new SSHAgent({
        proxy: `ssh://foo:bar@127.0.0.1:${setup.sshProxyPort}/`,
      });
      await agent.initialize();
      const stub = stubUnreachableBastion(agent);
      await tripCircuitBreaker(agent);
      stub.restore();

      clock = sinon.useFakeTimers({ toFake: ['Date'], now: Date.now() });
      clock.tick(10 * 60 * 1000);

      await agent.initialize(true);
      const response = await createFetch(agent)('http://example.com/hello');
      expect(await response.text()).to.equal('OK /hello');
      expect(setup.authHandler).to.have.been.calledTwice;
    });

    it('re-opens immediately if the first attempt after the cooldown fails', async function () {
      agent = new SSHAgent({
        proxy: `ssh://foo:bar@127.0.0.1:${setup.sshProxyPort}/`,
      });
      await agent.initialize();
      stubUnreachableBastion(agent);
      await tripCircuitBreaker(agent);

      clock = sinon.useFakeTimers({ toFake: ['Date'], now: Date.now() });
      clock.tick(10 * 60 * 1000);

      await agent.initialize(true).catch(() => {});

      const establishingEvents: unknown[] = [];
      agent.logger.on('ssh:establishing-conection', (e: unknown) =>
        establishingEvents.push(e),
      );
      await agent.initialize(true).then(
        () => expect.fail('missed exception'),
        (err) =>
          expect(err.message).to.include('repeated reconnection failures'),
      );
      expect(establishingEvents).to.have.length(0);
    });

    it('never reconnects after destroy(), even once the cooldown has elapsed', async function () {
      agent = new SSHAgent({
        proxy: `ssh://foo:bar@127.0.0.1:${setup.sshProxyPort}/`,
      });
      await agent.initialize();
      stubUnreachableBastion(agent);
      await tripCircuitBreaker(agent);
      agent.destroy();

      clock = sinon.useFakeTimers({ toFake: ['Date'], now: Date.now() });
      clock.tick(10 * 60 * 1000);

      await agent.initialize().then(
        () => expect.fail('missed exception'),
        (err) => expect(err.message).to.equal('Disconnected.'),
      );
    });
  });

  it('shares a single connection attempt between concurrent initialize() calls when using an identity file', async function () {
    // Reading the key file is async, so concurrent callers used to all pass the
    // "already connecting?" check and call connect() on the same ssh2 client.
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ssh-agent-test-'));
    try {
      const identityKeyFile = path.join(dir, 'id_ed25519');
      await fs.writeFile(
        identityKeyFile,
        ssh2Utils.generateKeyPairSync('ed25519').private,
      );
      agent = new SSHAgent({
        proxy: `ssh://foo@127.0.0.1:${setup.sshProxyPort}/`,
        sshOptions: { identityKeyFile },
      });
      const establishingEvents: unknown[] = [];
      agent.logger.on('ssh:establishing-conection', (e: unknown) =>
        establishingEvents.push(e),
      );

      await Promise.all([
        agent.initialize(),
        agent.initialize(),
        agent.initialize(),
      ]);

      expect(establishingEvents).to.have.length(1);
      const response = await createFetch(agent)('http://example.com/hello');
      expect(await response.text()).to.equal('OK /hello');
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('ignores late close events from a client that was already replaced', async function () {
    agent = new SSHAgent({
      proxy: `ssh://foo:bar@127.0.0.1:${setup.sshProxyPort}/`,
    });
    await agent.initialize();
    const oldClient = (agent as any).sshClient;
    await agent.initialize(true);
    expect((agent as any).connected).to.be.true;

    // After a sleep, the old socket may only report 'close' long after the
    // replacement connected.
    oldClient.emit('close');

    expect((agent as any).connected).to.be.true;
  });

  it('destroys the old client when replacing it', async function () {
    agent = new SSHAgent({
      proxy: `ssh://foo:bar@127.0.0.1:${setup.sshProxyPort}/`,
    });
    await agent.initialize();
    const destroy = sinon.spy((agent as any).sshClient, 'destroy');
    await agent.initialize(true);
    expect(destroy).to.have.been.calledOnce;
  });

  it('reconnects after the underlying connection is destroyed server-side', async function () {
    setup.authHandler = sinon.stub().returns(true);
    agent = new SSHAgent({
      proxy: `ssh://foo:bar@127.0.0.1:${setup.sshProxyPort}/`,
    });
    await agent.initialize();
    const fetch = createFetch(agent);
    await fetch('http://example.com/hello');
    expect(setup.authHandler).to.have.been.calledOnce;

    // Simulate the OS killing network connections during hibernate by
    // forcibly destroying the SSH server's TCP sockets (with a TCP reset)
    // from the server side, then wait for the agent to notice the loss.
    const clientClosed = once(agent.logger, 'ssh:client-closed');
    setup.destroySSHConnections();
    await clientClosed;

    // The next request must transparently re-establish the SSH connection.
    const response = await fetch('http://example.com/hello');
    expect(await response.text()).to.equal('OK /hello');
    expect(setup.authHandler).to.have.been.calledTwice;
  });
});
