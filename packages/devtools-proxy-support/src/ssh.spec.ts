import { EventEmitter, once } from 'events';
import { HTTPServerProxyTestSetup } from '../test/helpers';
import { SSHAgent } from './ssh';
import { createFetch } from './fetch';
import { expect } from 'chai';
import sinon from 'sinon';

async function expectAuthenticationFailure(agent: SSHAgent): Promise<void> {
  try {
    await agent.initialize();
    expect.fail('missed exception');
  } catch (err: unknown) {
    expect(err).to.be.instanceOf(Error);
    expect((err as Error).message).to.equal(
      'All configured authentication methods failed',
    );
  }
}

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

  it('does not send the password to keyboard-interactive after partial success', async function () {
    const keyboardInteractiveResponses: string[][] = [];
    setup.sshAuthenticationHandler = (ctx) => {
      if (ctx.method === 'none') {
        ctx.reject(['password', 'keyboard-interactive']);
        return;
      }
      if (ctx.method === 'password') {
        ctx.reject(['keyboard-interactive'], true);
        return;
      }
      if (ctx.method === 'keyboard-interactive') {
        ctx.prompt(
          [{ prompt: 'Verification code: ', echo: false }],
          (responses) => {
            keyboardInteractiveResponses.push(responses);
            ctx.reject();
          },
        );
        return;
      }
      ctx.reject();
    };
    agent = new SSHAgent({
      proxy: `ssh://foo:bar@127.0.0.1:${setup.sshProxyPort}/`,
    });

    await expectAuthenticationFailure(agent);

    expect(keyboardInteractiveResponses).to.deep.equal([]);
    expect(setup.sshAuthenticationAttempts).to.deep.equal([
      { username: 'foo', method: 'none' },
      { username: 'foo', method: 'password' },
    ]);
  });

  it('keeps partial success sticky after a public key rejection', async function () {
    const keyboardInteractiveResponses: string[][] = [];
    setup.sshAuthenticationHandler = (ctx) => {
      if (ctx.method === 'none') {
        ctx.reject(['password', 'publickey', 'keyboard-interactive']);
        return;
      }
      if (ctx.method === 'password') {
        ctx.reject(['publickey', 'keyboard-interactive'], true);
        return;
      }
      if (ctx.method === 'publickey') {
        setup.handleTestSshPublicKeyAuthentication(ctx, () => {
          ctx.reject(['keyboard-interactive'], false);
        });
        return;
      }
      if (ctx.method === 'keyboard-interactive') {
        ctx.prompt(
          [{ prompt: 'Verification code: ', echo: false }],
          (responses) => {
            keyboardInteractiveResponses.push(responses);
            ctx.reject();
          },
        );
        return;
      }
      ctx.reject();
    };
    agent = new SSHAgent({
      proxy: `ssh://foo:bar@127.0.0.1:${setup.sshProxyPort}/`,
      sshOptions: {
        identityKeyFile: setup.sshIdentityKeyFile,
      },
    });

    await expectAuthenticationFailure(agent);

    expect(keyboardInteractiveResponses).to.deep.equal([]);
    expect(setup.sshAuthenticationAttempts).to.deep.equal([
      { username: 'foo', method: 'none' },
      { username: 'foo', method: 'password' },
      { username: 'foo', method: 'publickey' },
      { username: 'foo', method: 'publickey' },
    ]);
  });

  it('continues public key authentication after a partially successful password', async function () {
    setup.sshAuthenticationHandler = (ctx) => {
      if (ctx.method === 'none') {
        ctx.reject(['password', 'publickey', 'keyboard-interactive']);
        return;
      }
      if (ctx.method === 'password') {
        ctx.reject(['publickey', 'keyboard-interactive'], true);
        return;
      }
      if (ctx.method === 'publickey') {
        setup.handleTestSshPublicKeyAuthentication(ctx, () => {
          ctx.accept();
        });
        return;
      }
      ctx.reject();
    };
    agent = new SSHAgent({
      proxy: `ssh://foo:bar@127.0.0.1:${setup.sshProxyPort}/`,
      sshOptions: {
        identityKeyFile: setup.sshIdentityKeyFile,
      },
    });

    const response = await createFetch(agent)('http://example.com/hello');

    expect(await response.text()).to.equal('OK /hello');
    expect(setup.sshAuthenticationAttempts).to.deep.equal([
      { username: 'foo', method: 'none' },
      { username: 'foo', method: 'password' },
      { username: 'foo', method: 'publickey' },
      { username: 'foo', method: 'publickey' },
    ]);
  });

  it('does not send the password after partial public key authentication', async function () {
    const keyboardInteractiveResponses: string[][] = [];
    setup.sshAuthenticationHandler = (ctx) => {
      if (ctx.method === 'none') {
        ctx.reject(['password', 'publickey', 'keyboard-interactive']);
        return;
      }
      if (ctx.method === 'password') {
        ctx.reject(['publickey', 'keyboard-interactive']);
        return;
      }
      if (ctx.method === 'publickey') {
        setup.handleTestSshPublicKeyAuthentication(ctx, () => {
          ctx.reject(['keyboard-interactive'], true);
        });
        return;
      }
      if (ctx.method === 'keyboard-interactive') {
        ctx.prompt(
          [{ prompt: 'Verification code: ', echo: false }],
          (responses) => {
            keyboardInteractiveResponses.push(responses);
            ctx.reject();
          },
        );
        return;
      }
      ctx.reject();
    };
    agent = new SSHAgent({
      proxy: `ssh://foo:bar@127.0.0.1:${setup.sshProxyPort}/`,
      sshOptions: {
        identityKeyFile: setup.sshIdentityKeyFile,
      },
    });

    await expectAuthenticationFailure(agent);

    expect(keyboardInteractiveResponses).to.deep.equal([]);
    expect(setup.sshAuthenticationAttempts).to.deep.equal([
      { username: 'foo', method: 'none' },
      { username: 'foo', method: 'password' },
      { username: 'foo', method: 'publickey' },
      { username: 'foo', method: 'publickey' },
    ]);
  });

  it('authenticates with only a configured public key', async function () {
    setup.sshAuthenticationHandler = (ctx) => {
      if (ctx.method === 'none') {
        ctx.reject(['publickey']);
        return;
      }
      if (ctx.method === 'publickey') {
        setup.handleTestSshPublicKeyAuthentication(ctx, () => {
          ctx.accept();
        });
        return;
      }
      ctx.reject();
    };
    agent = new SSHAgent({
      proxy: `ssh://foo@127.0.0.1:${setup.sshProxyPort}/`,
      sshOptions: {
        identityKeyFile: setup.sshIdentityKeyFile,
      },
    });

    const response = await createFetch(agent)('http://example.com/hello');

    expect(await response.text()).to.equal('OK /hello');
    expect(setup.sshAuthenticationAttempts).to.deep.equal([
      { username: 'foo', method: 'none' },
      { username: 'foo', method: 'publickey' },
      { username: 'foo', method: 'publickey' },
    ]);
  });

  it('uses keyboard-interactive after a password rejection without partial success', async function () {
    const keyboardInteractiveResponses: string[][] = [];
    setup.sshAuthenticationHandler = (ctx) => {
      if (ctx.method === 'none') {
        ctx.reject(['password', 'keyboard-interactive']);
        return;
      }
      if (ctx.method === 'password') {
        ctx.reject(['keyboard-interactive']);
        return;
      }
      if (ctx.method === 'keyboard-interactive') {
        ctx.prompt([{ prompt: 'Password: ', echo: false }], (responses) => {
          keyboardInteractiveResponses.push(responses);
          if (responses.length === 1 && responses[0] === 'bar') {
            ctx.accept();
          } else {
            ctx.reject();
          }
        });
        return;
      }
      ctx.reject();
    };
    agent = new SSHAgent({
      proxy: `ssh://foo:bar@127.0.0.1:${setup.sshProxyPort}/`,
    });

    const response = await createFetch(agent)('http://example.com/hello');

    expect(await response.text()).to.equal('OK /hello');
    expect(keyboardInteractiveResponses).to.deep.equal([['bar']]);
    expect(setup.sshAuthenticationAttempts).to.deep.equal([
      { username: 'foo', method: 'none' },
      { username: 'foo', method: 'password' },
      { username: 'foo', method: 'keyboard-interactive' },
    ]);
  });

  it('uses the password for a single hidden keyboard-interactive prompt', async function () {
    setup.sshKeyboardInteractiveAuthRounds = [
      {
        prompts: [{ prompt: 'Password: ', echo: false }],
        expectedResponses: ['bar'],
      },
    ];
    agent = new SSHAgent({
      proxy: `ssh://foo:bar@127.0.0.1:${setup.sshProxyPort}/`,
    });

    const response = await createFetch(agent)('http://example.com/hello');

    expect(await response.text()).to.equal('OK /hello');
    expect(setup.sshKeyboardInteractiveAuthAttempts).to.deep.equal([
      { username: 'foo', responses: [['bar']] },
    ]);
  });

  it('does not consume the password on an empty keyboard-interactive round', async function () {
    setup.sshKeyboardInteractiveAuthRounds = [
      { prompts: [], expectedResponses: [] },
      {
        prompts: [{ prompt: 'Password: ', echo: false }],
        expectedResponses: ['bar'],
      },
    ];
    agent = new SSHAgent({
      proxy: `ssh://foo:bar@127.0.0.1:${setup.sshProxyPort}/`,
    });

    await agent.initialize();

    expect(setup.sshKeyboardInteractiveAuthAttempts).to.deep.equal([
      { username: 'foo', responses: [[], ['bar']] },
    ]);
  });

  it('does not expose the password to multiple keyboard-interactive prompts', async function () {
    setup.sshKeyboardInteractiveAuthRounds = [
      {
        prompts: [
          { prompt: 'Password: ', echo: false },
          { prompt: 'Verification code: ', echo: false },
        ],
        expectedResponses: ['', ''],
      },
    ];
    agent = new SSHAgent({
      proxy: `ssh://foo:bar@127.0.0.1:${setup.sshProxyPort}/`,
    });

    await agent.initialize();

    expect(setup.sshKeyboardInteractiveAuthAttempts).to.deep.equal([
      { username: 'foo', responses: [['', '']] },
    ]);
  });

  it('does not expose the password to a visible keyboard-interactive prompt', async function () {
    setup.sshKeyboardInteractiveAuthRounds = [
      {
        prompts: [{ prompt: 'Username: ', echo: true }],
        expectedResponses: [''],
      },
    ];
    agent = new SSHAgent({
      proxy: `ssh://foo:bar@127.0.0.1:${setup.sshProxyPort}/`,
    });

    await agent.initialize();

    expect(setup.sshKeyboardInteractiveAuthAttempts).to.deep.equal([
      { username: 'foo', responses: [['']] },
    ]);
  });

  it('does not reuse the password for a later keyboard-interactive round', async function () {
    setup.sshKeyboardInteractiveAuthRounds = [
      {
        prompts: [{ prompt: 'Password: ', echo: false }],
        expectedResponses: ['bar'],
      },
      {
        prompts: [{ prompt: 'Verification code: ', echo: false }],
        expectedResponses: [''],
      },
    ];
    agent = new SSHAgent({
      proxy: `ssh://foo:bar@127.0.0.1:${setup.sshProxyPort}/`,
    });

    await agent.initialize();

    expect(setup.sshKeyboardInteractiveAuthAttempts).to.deep.equal([
      { username: 'foo', responses: [['bar'], ['']] },
    ]);
  });

  it('rejects an incorrect keyboard-interactive password', async function () {
    setup.sshKeyboardInteractiveAuthRounds = [
      {
        prompts: [{ prompt: 'Password: ', echo: false }],
        expectedResponses: ['bar'],
      },
    ];
    agent = new SSHAgent({
      proxy: `ssh://foo:wrong@127.0.0.1:${setup.sshProxyPort}/`,
    });

    try {
      await agent.initialize();
      expect.fail('missed exception');
    } catch (err: any) {
      expect(err.message).to.equal(
        'All configured authentication methods failed',
      );
    }
    expect(setup.sshKeyboardInteractiveAuthAttempts).to.deep.equal([
      { username: 'foo', responses: [['wrong']] },
    ]);
  });

  it('does not attempt keyboard-interactive authentication without a password', async function () {
    setup.sshKeyboardInteractiveAuthRounds = [
      {
        prompts: [{ prompt: 'Password: ', echo: false }],
        expectedResponses: ['bar'],
      },
    ];
    agent = new SSHAgent({
      proxy: `ssh://foo@127.0.0.1:${setup.sshProxyPort}/`,
    });

    try {
      await agent.initialize();
      expect.fail('missed exception');
    } catch (err: any) {
      expect(err.message).to.equal(
        'All configured authentication methods failed',
      );
    }
    expect(setup.sshKeyboardInteractiveAuthAttempts).to.have.length(0);
  });

  it('can use the password again when the SSH client reconnects', async function () {
    setup.sshKeyboardInteractiveAuthRounds = [
      {
        prompts: [{ prompt: 'Password: ', echo: false }],
        expectedResponses: ['bar'],
      },
    ];
    agent = new SSHAgent({
      proxy: `ssh://foo:bar@127.0.0.1:${setup.sshProxyPort}/`,
    });
    const fetch = createFetch(agent);

    const firstResponse = await fetch('http://example.com/hello');
    expect(await firstResponse.text()).to.equal('OK /hello');
    await agent.interruptForTesting();
    const secondResponse = await fetch('http://example.com/hello');
    expect(await secondResponse.text()).to.equal('OK /hello');

    expect(setup.sshKeyboardInteractiveAuthAttempts).to.deep.equal([
      { username: 'foo', responses: [['bar']] },
      { username: 'foo', responses: [['bar']] },
    ]);
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

  it('marks itself as closed after too many consecutive reinit failures', async function () {
    setup.authHandler = sinon.stub().returns(true);
    agent = new SSHAgent({
      proxy: `ssh://foo:bar@127.0.0.1:${setup.sshProxyPort}/`,
    });
    await agent.initialize();

    // Stub createSshClient to always return a client that fails to connect,
    // simulating a bastion that is unreachable after a long hibernate.
    sinon.stub(agent as any, 'createSshClient').callsFake(() => {
      const client = new EventEmitter() as any;
      client.connect = () => {
        process.nextTick(() =>
          client.emit('error', new Error('Connection refused')),
        );
      };
      client.end = () => {};
      return client;
    });
    (agent as any).connected = false;

    for (let i = 0; i < 3; i++) {
      await agent.initialize(true).catch(() => {});
    }

    expect((agent as any).closed).to.be.true;

    // Further calls must throw 'Disconnected.' without attempting a new connection.
    const establishingEvents: unknown[] = [];
    agent.logger.on('ssh:establishing-conection', (e: unknown) =>
      establishingEvents.push(e),
    );
    try {
      await agent.initialize();
      expect.fail('missed exception');
    } catch (err: any) {
      expect(err.message).to.equal('Disconnected.');
    }
    expect(establishingEvents).to.have.length(0);
    expect(setup.authHandler).to.have.been.calledOnce;
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
