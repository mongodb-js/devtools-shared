import { expect } from 'chai';
import { createFetch } from './';
import { HTTPServerProxyTestSetup } from '../test/helpers';

describe('createFetch', function () {
  it("consistency check: plain `import('node-fetch')` fails", async function () {
    let failed = false;
    try {
      await import('node-fetch');
    } catch (error) {
      failed = true;
      expect((error as Error).message).to.include('require() of ES Module');
    }
    expect(failed).to.equal(true);
  });

  context('HTTP calls', function () {
    let fetch: ReturnType<typeof createFetch>;
    let setup: HTTPServerProxyTestSetup;

    beforeEach(async function () {
      setup = new HTTPServerProxyTestSetup();
      await setup.listen();
    });

    afterEach(async function () {
      await setup.teardown();
      fetch?.agent?.destroy?.();
    });

    it('provides a node-fetch-like HTTP functionality', async function () {
      const response = await createFetch({})(
        `http://127.0.0.1:${setup.httpServerPort}/test`,
      );
      expect(await response.text()).to.equal('OK /test');
    });

    it('makes use of SSH proxy support when instructed to do so', async function () {
      fetch = createFetch({
        proxy: `ssh://someuser@127.0.0.1:${setup.sshProxyPort}`,
      });
      const response = await fetch(
        `http://localhost:${setup.httpServerPort}/test`,
      );
      expect(await response.text()).to.equal('OK /test');
      expect(setup.sshTunnelInfos).to.deep.equal([
        {
          destIP: 'localhost',
          destPort: setup.httpServerPort,
          srcIP: '127.0.0.1',
          srcPort: 0,
        },
      ]);
    });

    it('makes use of HTTP proxy support when instructed to do so', async function () {
      fetch = createFetch({
        proxy: `http://127.0.0.1:${setup.httpProxyPort}`,
      });
      const response = await fetch(
        `http://localhost:${setup.httpServerPort}/test`,
      );
      expect(await response.text()).to.equal('OK /test');
    });

    it('makes use of HTTPS proxy support when instructed to do so', async function () {
      fetch = createFetch({
        proxy: `http://127.0.0.1:${setup.httpsProxyPort}`,
        ca: setup.tlsOptions.ca,
      });
      const response = await fetch(
        `https://localhost:${setup.httpsServerPort}/test`,
      );
      expect(await response.text()).to.equal('OK /test');
    });

    it('makes use of Socks5 proxy support when instructed to do so', async function () {
      setup.socks5AuthNone();
      fetch = createFetch({
        proxy: `socks5://127.0.0.1:${setup.socks5ProxyPort}`,
      });
      const response = await fetch(
        `http://localhost:${setup.httpServerPort}/test`,
      );
      expect(await response.text()).to.equal('OK /test');
    });

    it('makes use of PAC-based proxy support when instructed to do so', async function () {
      setup.socks5AuthNone();
      fetch = createFetch({
        proxy: `pac+http://127.0.0.1:${setup.httpServerPort}/pac`,
      });
      const response = await fetch(
        `http://localhost:${setup.httpsServerPort}/test`,
      );
      expect(await response.text()).to.equal('OK /test');

      try {
        await fetch(`http://pac-invalidproxy/test`);
        expect.fail('missed exception');
      } catch (err) {
        expect(err.message).to.include(
          'Failed to establish a socket connection to proxies: ["SOCKS5 127.0.0.1:1"]',
        );
      }
    });
  });
});
