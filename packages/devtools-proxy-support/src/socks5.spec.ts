import sinon from 'sinon';
import { HTTPServerProxyTestSetup } from '../test/helpers';
import type { Tunnel } from './socks5';
import { setupSocks5Tunnel } from './socks5';
import { expect } from 'chai';
import { createFetch } from './fetch';

describe('setupSocks5Tunnel', function () {
  let setup: HTTPServerProxyTestSetup;
  let tunnel: Tunnel | undefined;

  beforeEach(async function () {
    setup = new HTTPServerProxyTestSetup();
    await setup.listen();
    tunnel = undefined;
  });

  afterEach(async function () {
    await setup.teardown();
    await tunnel?.close();
  });

  it('can be used to create a Socks5 server that forwards requests to another proxy', async function () {
    setup.authHandler = sinon.stub().returns(true);

    tunnel = await setupSocks5Tunnel(
      {
        proxy: `http://foo:bar@127.0.0.1:${setup.httpProxyPort}`,
      },
      {
        proxyUsername: 'baz',
        proxyPassword: 'quux',
      }
    );
    if (!tunnel) {
      // regular conditional instead of assertion so that TS can follow it
      expect.fail('failed to create Socks5 tunnel');
    }

    const fetch = createFetch({
      proxy: `socks5://baz:quux@127.0.0.1:${tunnel.config.proxyPort}`,
    });
    const response = await fetch('http://example.com/hello');
    expect(await response.text()).to.equal('OK /hello');

    try {
      await fetch('http://localhost:1/hello');
      expect.fail('missed exception');
    } catch (err) {
      expect(err.message).to.include(
        'request to http://localhost:1/hello failed'
      );
    }
  });

  it('rejects mismatching auth', async function () {
    tunnel = await setupSocks5Tunnel(
      {
        useEnvironmentVariableProxies: true,
        env: {},
      },
      {
        proxyUsername: 'baz',
        proxyPassword: 'quux',
      }
    );
    if (!tunnel) {
      // regular conditional instead of assertion so that TS can follow it
      expect.fail('failed to create Socks5 tunnel');
    }

    const fetch = createFetch({
      proxy: `socks5://baz:wrongpassword@127.0.0.1:${tunnel.config.proxyPort}`,
    });

    try {
      await fetch('http://localhost:1234/hello');
      expect.fail('missed exception');
    } catch (err) {
      expect(err.message).to.include('Socks5 Authentication failed');
    }
  });

  it('reports an error when it fails to listen', async function () {
    try {
      await setupSocks5Tunnel(
        {
          useEnvironmentVariableProxies: true,
          env: {},
        },
        {
          proxyHost: 'example.net',
        }
      );
      expect.fail('missed exception');
    } catch (err) {
      expect(err.code).to.equal('EADDRNOTAVAIL');
    }
  });
});
