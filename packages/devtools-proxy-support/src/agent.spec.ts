import { createAgent } from './';
import type { Agent, IncomingMessage } from 'http';
import { get as httpGet } from 'http';
import { get as httpsGet } from 'https';
import { expect } from 'chai';
import sinon from 'sinon';
import { HTTPServerProxyTestSetup } from '../test/helpers';

describe('createAgent', function () {
  let setup: HTTPServerProxyTestSetup;
  let agents: Agent[];

  const get = async (
    url: string,
    agent: Agent
  ): Promise<IncomingMessage & { body: string }> => {
    const getFn = new URL(url).protocol === 'https:' ? httpsGet : httpGet;
    const options = {
      agent,
      ca: setup.tlsOptions.ca,
      checkServerIdentity: () => undefined, // allow hostname mismatches
    };
    agents.push(agent);
    const res = await new Promise<IncomingMessage>((resolve, reject) =>
      getFn(url, options, resolve).once('error', reject)
    );
    let body = '';
    res.setEncoding('utf8');
    for await (const chunk of res) body += chunk;
    return Object.assign(res, { body });
  };

  beforeEach(async function () {
    agents = [];
    setup = new HTTPServerProxyTestSetup();
    await setup.listen();
  });

  afterEach(async function () {
    await setup.teardown();
    for (const agent of new Set(agents)) {
      agent.destroy();
    }
  });

  context('socks5', function () {
    it('can connect to a socks5 proxy without auth', async function () {
      setup.socks5AuthNone();

      const res = await get(
        'http://example.com/hello',
        createAgent({ proxy: `socks5://127.0.0.1:${setup.socks5ProxyPort}` })
      );
      expect(res.body).to.equal('OK /hello');
      expect(setup.getRequestedUrls()).to.deep.equal([
        'http://example.com/hello',
      ]);
    });

    it('can connect to a socks5 proxy with successful auth', async function () {
      const authHandler = sinon.stub().yields(true);
      setup.socks5AuthUsernamePassword(authHandler);

      const res = await get(
        'http://example.com/hello',
        createAgent({
          proxy: `socks5://foo:bar@127.0.0.1:${setup.socks5ProxyPort}`,
        })
      );
      expect(res.body).to.equal('OK /hello');
      expect(setup.getRequestedUrls()).to.deep.equal([
        'http://example.com/hello',
      ]);
      expect(authHandler).to.have.been.calledOnceWith('foo', 'bar');
    });

    it('fails to connect to a socks5 proxy with unsuccessful auth', async function () {
      const authHandler = sinon.stub().yields(false);
      setup.socks5AuthUsernamePassword(authHandler);

      try {
        await get(
          'http://example.com/hello',
          createAgent({
            proxy: `socks5://foo:bar@127.0.0.1:${setup.socks5ProxyPort}`,
          })
        );
        expect.fail('missed exception');
      } catch (err: any) {
        expect(err.message).to.equal('Socks5 Authentication failed');
      }
    });
  });

  context('http proxy', function () {
    it('can connect to an http proxy without auth', async function () {
      const res = await get(
        'http://example.com/hello',
        createAgent({ proxy: `http://127.0.0.1:${setup.httpProxyPort}` })
      );
      expect(res.body).to.equal('OK /hello');
      expect(setup.getRequestedUrls()).to.deep.equal([
        'http://example.com/hello',
      ]);
    });

    it('can connect to an http proxy with successful auth', async function () {
      setup.authHandler = sinon.stub().returns(true);

      const res = await get(
        'http://example.com/hello',
        createAgent({
          proxy: `http://foo:bar@127.0.0.1:${setup.httpProxyPort}`,
        })
      );
      expect(res.body).to.equal('OK /hello');
      expect(setup.getRequestedUrls()).to.deep.equal([
        'http://example.com/hello',
      ]);
      expect(setup.authHandler).to.have.been.calledOnceWith('foo', 'bar');
    });

    it('fails to connect to an http proxy with unsuccessful auth', async function () {
      setup.authHandler = sinon.stub().returns(false);

      const res = await get(
        'http://example.com/hello',
        createAgent({
          proxy: `http://foo:bar@127.0.0.1:${setup.httpProxyPort}`,
        })
      );
      expect(res.statusCode).to.equal(407);
    });
  });

  context('https/connect proxy', function () {
    it('can connect to an https proxy without auth', async function () {
      const res = await get(
        'https://example.com/hello',
        createAgent({ proxy: `http://127.0.0.1:${setup.httpsProxyPort}` })
      );
      expect(res.body).to.equal('OK /hello');
      expect(setup.getRequestedUrls()).to.deep.equal([
        'http://example.com/hello',
      ]);
    });

    it('can connect to an https proxy with successful auth', async function () {
      setup.authHandler = sinon.stub().returns(true);

      const res = await get(
        'https://example.com/hello',
        createAgent({
          proxy: `http://foo:bar@127.0.0.1:${setup.httpsProxyPort}`,
        })
      );
      expect(res.body).to.equal('OK /hello');
      expect(setup.getRequestedUrls()).to.deep.equal([
        'http://example.com/hello',
      ]);
      expect(setup.authHandler).to.have.been.calledOnceWith('foo', 'bar');
    });

    it('fails to connect to an https proxy with unsuccessful auth', async function () {
      setup.authHandler = sinon.stub().returns(false);

      const res = await get(
        'https://example.com/hello',
        createAgent({
          proxy: `http://foo:bar@127.0.0.1:${setup.httpsProxyPort}`,
        })
      );
      expect(res.statusCode).to.equal(407);
    });
  });

  context('ssh proxy', function () {
    it('can connect to an ssh proxy without auth', async function () {
      const res = await get(
        'http://example.com/hello',
        createAgent({ proxy: `ssh://someuser@127.0.0.1:${setup.sshProxyPort}` })
      );
      expect(res.body).to.equal('OK /hello');
      expect(setup.getRequestedUrls()).to.deep.equal([
        'http://example.com/hello',
      ]);
      expect(setup.sshTunnelInfos).to.deep.equal([
        { destIP: 'example.com', destPort: 80, srcIP: '127.0.0.1', srcPort: 0 },
      ]);
    });

    it('can connect to an ssh proxy with successful auth', async function () {
      setup.authHandler = sinon.stub().returns(true);

      const res = await get(
        'http://example.com/hello',
        createAgent({ proxy: `ssh://foo:bar@127.0.0.1:${setup.sshProxyPort}` })
      );
      expect(res.body).to.equal('OK /hello');
      expect(setup.getRequestedUrls()).to.deep.equal([
        'http://example.com/hello',
      ]);
      expect(setup.authHandler).to.have.been.calledOnceWith('foo', 'bar');
    });

    it('fails to connect to an ssh proxy with unsuccessful auth', async function () {
      setup.authHandler = sinon.stub().returns(false);

      try {
        await get(
          'http://example.com/hello',
          createAgent({
            proxy: `ssh://foo:bar@127.0.0.1:${setup.sshProxyPort}`,
          })
        );
        expect.fail('missed exception');
      } catch (err: any) {
        expect(err.message).to.equal(
          'All configured authentication methods failed'
        );
      }
    });

    it('fails to connect to an ssh proxy with unavailable tunneling', async function () {
      setup.authHandler = sinon.stub().returns(true);
      setup.canTunnel = false;

      try {
        await get(
          'http://example.com/hello',
          createAgent({
            proxy: `ssh://foo:bar@127.0.0.1:${setup.sshProxyPort}`,
          })
        );
        expect.fail('missed exception');
      } catch (err: any) {
        expect(err.message).to.include('Channel open failure');
      }
    });
  });
});
