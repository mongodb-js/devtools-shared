import { HTTPServerProxyTestSetup } from '../test/helpers';
import { SSHAgent } from './ssh';
import { createFetch } from './fetch';
import { expect } from 'chai';
import sinon from 'sinon';

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
});
