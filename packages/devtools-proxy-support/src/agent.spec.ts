import { createAgent, resetSystemCACache } from './';
import type { Agent, IncomingMessage } from 'http';
import { get as httpGet } from 'http';
import type { RequestOptions } from 'https';
import { get as httpsGet } from 'https';
import { expect } from 'chai';
import sinon from 'sinon';
import { HTTPServerProxyTestSetup } from '../test/helpers';
import path from 'path';
import type { Server as TLSServer } from 'tls';
import { createServer as createTLSServer } from 'tls';
import { promises as fs } from 'fs';
import type { AddressInfo } from 'net';
import { tlsSupportsAllowPartialTrustChainFlag } from './system-ca';

describe('createAgent', function () {
  let setup: HTTPServerProxyTestSetup;
  let agents: Agent[];

  const get = async (
    url: string,
    agent: Agent,
    customOptions: RequestOptions = {}
  ): Promise<IncomingMessage & { body: string }> => {
    const nodeJSBuiltinGet =
      new URL(url).protocol === 'https:' ? httpsGet : httpGet;
    const options = {
      agent,
      checkServerIdentity: () => undefined, // allow hostname mismatches
      ...customOptions,
    };
    agents.push(agent);
    const res = await new Promise<IncomingMessage>((resolve, reject) =>
      nodeJSBuiltinGet(url, options, resolve).once('error', reject)
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
    resetSystemCACache();
  });

  afterEach(async function () {
    resetSystemCACache();
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
        createAgent({
          proxy: `http://127.0.0.1:${setup.httpsProxyPort}`,
          ca: setup.tlsOptions.ca,
        })
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
          ca: setup.tlsOptions.ca,
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
          ca: setup.tlsOptions.ca,
        })
      );
      expect(res.statusCode).to.equal(407);
    });

    context('ca support', function () {
      it('can connect using CA as part of the agent options (no explicit CA set)', async function () {
        const res = await get(
          'https://example.com/hello',
          createAgent({
            proxy: `http://127.0.0.1:${setup.httpsProxyPort}`,
            ca: setup.tlsOptions.ca,
          }),
          { ca: undefined }
        );
        expect(res.body).to.equal('OK /hello');
        expect(setup.getRequestedUrls()).to.deep.equal([
          'http://example.com/hello',
        ]);
      });
      it('can connect using CA as part of the agent options (different explicit CA set)', async function () {
        const res = await get(
          'https://example.com/hello',
          createAgent({
            proxy: `http://127.0.0.1:${setup.httpsProxyPort}`,
            ca: setup.tlsOptions.ca,
          }),
          {
            ca: `-----BEGIN CERTIFICATE-----
MIIECTCCA3KgAwIBAgIUDnU7Oa0fU9GFOwU7EWJP3HsRchEwDQYJKoZIhvcNAQEL
BQAwgZkxCzAJBgNVBAYTAlVTMRAwDgYDVQQIDAdNb250YW5hMRAwDgYDVQQHDAdC
b3plbWFuMREwDwYDVQQKDAhTYXd0b290aDEYMBYGA1UECwwPQ29uc3VsdGluZ18x
MDI0MRgwFgYDVQQDDA93d3cud29sZnNzbC5jb20xHzAdBgkqhkiG9w0BCQEWEGlu
Zm9Ad29sZnNzbC5jb20wHhcNMjIxMjE2MjExNzQ5WhcNMjUwOTExMjExNzQ5WjCB
mTELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB01vbnRhbmExEDAOBgNVBAcMB0JvemVt
YW4xETAPBgNVBAoMCFNhd3Rvb3RoMRgwFgYDVQQLDA9Db25zdWx0aW5nXzEwMjQx
GDAWBgNVBAMMD3d3dy53b2xmc3NsLmNvbTEfMB0GCSqGSIb3DQEJARYQaW5mb0B3
b2xmc3NsLmNvbTCBnzANBgkqhkiG9w0BAQEFAAOBjQAwgYkCgYEAzazdR+y+tyTD
YxtUmHnhxzEWWdadd52N4ovtBBeyxuvkm5G+MVBil1i1fynes3EkC7+XCX8m3C3s
qC6yZCt6KzUZLaKAy5n9lHEbI41U2y5ijYEILfQkcids+cmO20x1upsB+D8Y9OZ/
+1eUksyIxLQAwqrU5YgYsxEvc8DWKQkCAwEAAaOCAUowggFGMB0GA1UdDgQWBBTT
Io8oLOAF7tPtw3E9ybI2Oh2/qDCB2QYDVR0jBIHRMIHOgBTTIo8oLOAF7tPtw3E9
ybI2Oh2/qKGBn6SBnDCBmTELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB01vbnRhbmEx
EDAOBgNVBAcMB0JvemVtYW4xETAPBgNVBAoMCFNhd3Rvb3RoMRgwFgYDVQQLDA9D
b25zdWx0aW5nXzEwMjQxGDAWBgNVBAMMD3d3dy53b2xmc3NsLmNvbTEfMB0GCSqG
SIb3DQEJARYQaW5mb0B3b2xmc3NsLmNvbYIUDnU7Oa0fU9GFOwU7EWJP3HsRchEw
DAYDVR0TBAUwAwEB/zAcBgNVHREEFTATggtleGFtcGxlLmNvbYcEfwAAATAdBgNV
HSUEFjAUBggrBgEFBQcDAQYIKwYBBQUHAwIwDQYJKoZIhvcNAQELBQADgYEAuIC/
svWDlVGBan5BhynXw8nGm2DkZaEElx0bO+kn+kPWiWo8nr8o0XU3IfMNZBeyoy2D
Uv9X8EKpSKrYhOoNgAVxCqojtGzG1n8TSvSCueKBrkaMWfvDjG1b8zLshvBu2ip4
q/I2+0j6dAkOGcK/68z7qQXByeGri3n28a1Kn6o=
-----END CERTIFICATE-----`,
          }
        );
        expect(res.body).to.equal('OK /hello');
        expect(setup.getRequestedUrls()).to.deep.equal([
          'http://example.com/hello',
        ]);
      });
      it('can connect using CA in the system CA list', async function () {
        if (process.platform !== 'linux') return this.skip(); // only really mock-able on Linux
        resetSystemCACache({
          env: {
            SSL_CERT_FILE: path.resolve(
              __dirname,
              '..',
              'test',
              'fixtures',
              'ca.crt'
            ),
          },
        });
        const res = await get(
          'https://example.com/hello',
          createAgent({ proxy: `http://127.0.0.1:${setup.httpsProxyPort}` }),
          { ca: undefined }
        );
        expect(res.body).to.equal('OK /hello');
        expect(setup.getRequestedUrls()).to.deep.equal([
          'http://example.com/hello',
        ]);
      });
      it('consistency check: fails without a CA option set', async function () {
        try {
          await get(
            'https://example.com/hello',
            createAgent({ proxy: `http://127.0.0.1:${setup.httpsProxyPort}` }),
            { ca: undefined }
          );
          expect.fail('missed exception');
        } catch (err) {
          expect(err.code).to.equal('SELF_SIGNED_CERT_IN_CHAIN');
        }
      });
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
      setup.canTunnel = sinon.stub().returns(false);

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

  context('invalid arguments', function () {
    it('does not receive unhandled rejections when using invalid options', async function () {
      // This test may seem contrived, but it mimics FIPS mode without a valid system FIPS config
      // (i.e. OpenSSL cannot load ciphers) -- this should result in a handled rejection, rather than
      // an unhandled one.
      try {
        await get(
          'https://example.com/hello',
          createAgent({ ciphers: 'unknown' } as any)
        );
        expect.fail('missed exception');
      } catch (err: any) {
        expect(err.message).to.include('no cipher match');
      }
    });
  });

  // This mirrors https://github.com/nodejs/node/blob/1b3420274ea8d8cca339a1f10301d2e80f577c4c/test/parallel/test-tls-client-allow-partial-trust-chain.js
  context(
    'TLS with partial trust chain in system certificate list',
    function () {
      const fixtures = path.resolve(
        __dirname,
        '..',
        'test',
        'fixtures',
        'partial-trust-chain'
      );
      let server: TLSServer;

      beforeEach(async function () {
        server = createTLSServer(
          {
            ca: await fs.readFile(path.join(fixtures, 'ca.pem')),
            key: await fs.readFile(path.join(fixtures, 'key.pem')),
            cert: await fs.readFile(path.join(fixtures, 'cert.pem')),
          },
          (socket) => socket.end('HTTP/1.0 200 OK\r\n\r\nOK /hello')
        );
        server.listen(0);
      });

      afterEach(function () {
        server?.close();
      });

      it('can connect using partial trust chains in the system CA list', async function () {
        if (
          process.platform !== 'linux' ||
          !tlsSupportsAllowPartialTrustChainFlag()
        )
          return this.skip(); // only really mock-able on Linux
        resetSystemCACache({
          env: {
            SSL_CERT_FILE: path.join(fixtures, 'ca.pem'),
            SSL_CERT_DIR: '/nonexistent',
          },
        });

        const res = await get(
          `https://localhost:${(server.address() as AddressInfo).port}/hello`,
          createAgent({})
        );
        expect(res.body).to.equal('OK /hello');
      });
    }
  );
});
