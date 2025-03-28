import sinon from 'sinon';
import { HTTPServerProxyTestSetup } from '../test/helpers';
import type { Tunnel, TunnelOptions } from './socks5';
import { connectThroughAgent, createSocks5Tunnel } from './socks5';
import { expect } from 'chai';
import { createFetch } from './fetch';
import type { DevtoolsProxyOptions } from './proxy-options';
import { createAgent } from './agent';
import type { AddressInfo, Server } from 'net';
import { createConnection, createServer } from 'net';
import { once } from 'events';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';

describe('createSocks5Tunnel', function () {
  let setup: HTTPServerProxyTestSetup;
  let tunnel: Tunnel | undefined;
  const setupSocks5Tunnel = async (
    ...args: Parameters<typeof createSocks5Tunnel>
  ): Promise<ReturnType<typeof createSocks5Tunnel>> => {
    const tunnel = createSocks5Tunnel(...args);
    await tunnel?.listen();
    return tunnel;
  };

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
      },
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
        'request to http://localhost:1/hello failed',
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
      },
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
        },
      );
      expect.fail('missed exception');
    } catch (err) {
      expect(err.code).to.equal('EADDRNOTAVAIL');
    }
  });

  it('does not start an actual server if the proxy config already specifies socks5', async function () {
    async function existingTunnelConfig(
      options: DevtoolsProxyOptions,
      target?: string,
    ): Promise<TunnelOptions | undefined> {
      const tunnel = await setupSocks5Tunnel(options, undefined, target);
      expect(tunnel?.constructor.name).to.equal('ExistingTunnel');
      return JSON.parse(JSON.stringify(tunnel?.config)); // filter out undefined values
    }

    expect(
      await existingTunnelConfig({ proxy: 'socks5://example.com:123' }),
    ).to.deep.equal({ proxyHost: 'example.com', proxyPort: 123 });
    expect(
      await existingTunnelConfig({ proxy: 'socks5://example.com' }),
    ).to.deep.equal({ proxyHost: 'example.com', proxyPort: 1080 });
    expect(
      await existingTunnelConfig({ proxy: 'socks5://foo:bar@example.com' }),
    ).to.deep.equal({
      proxyHost: 'example.com',
      proxyPort: 1080,
      proxyUsername: 'foo',
      proxyPassword: 'bar',
    });
    expect(
      await existingTunnelConfig(
        { proxy: 'socks5://example.com:123' },
        'mongodb://',
      ),
    ).to.deep.equal({ proxyHost: 'example.com', proxyPort: 123 });
    expect(
      await existingTunnelConfig(
        {
          useEnvironmentVariableProxies: true,
          env: { MONGODB_PROXY: 'socks5://example.com:123' },
        },
        'mongodb://',
      ),
    ).to.deep.equal({ proxyHost: 'example.com', proxyPort: 123 });
  });

  it('can generate access credentials on demand', async function () {
    tunnel = await setupSocks5Tunnel(
      {
        proxy: `http://foo:bar@127.0.0.1:${setup.httpProxyPort}`,
      },
      'generate-credentials',
    );
    if (!tunnel) {
      // regular conditional instead of assertion so that TS can follow it
      expect.fail('failed to create Socks5 tunnel');
    }

    const fetch = createFetch({
      proxy: `socks5://${encodeURIComponent(
        tunnel.config.proxyUsername!,
      )}:${encodeURIComponent(tunnel.config.proxyPassword!)}@127.0.0.1:${
        tunnel.config.proxyPort
      }`,
    });
    const response = await fetch('http://example.com/hello');
    expect(await response.text()).to.equal('OK /hello');

    try {
      await createFetch({
        proxy: `socks5://AzureDiamond:hunter2@127.0.0.1:${tunnel.config.proxyPort}`,
      })('http://localhost:1234/hello');
      expect.fail('missed exception');
    } catch (err) {
      expect(err.message).to.include('Socks5 Authentication failed');
    }
  });

  it('picks the proxy specified by the target protocol, if any', async function () {
    tunnel = await setupSocks5Tunnel(
      {
        useEnvironmentVariableProxies: true,
        env: {
          MONGODB_PROXY: `http://foo:bar@127.0.0.1:${setup.httpProxyPort}`,
        },
      },
      {},
      'mongodb://',
    );
    if (!tunnel) {
      // regular conditional instead of assertion so that TS can follow it
      expect.fail('failed to create Socks5 tunnel');
    }

    const fetch = createFetch({
      proxy: `socks5://@127.0.0.1:${tunnel.config.proxyPort}`,
    });
    const response = await fetch('http://example.com/hello');
    expect(await response.text()).to.equal('OK /hello');
  });

  it('properly handles forwarding failures', async function () {
    tunnel = await setupSocks5Tunnel(
      {
        useEnvironmentVariableProxies: true,
        env: {
          MONGODB_PROXY: `http://foo:bar@127.0.0.1:1`,
        },
      },
      {},
      'mongodb://',
    );
    if (!tunnel) {
      // regular conditional instead of assertion so that TS can follow it
      expect.fail('failed to create Socks5 tunnel');
    }

    try {
      const fetch = createFetch({
        proxy: `socks5://@127.0.0.1:${tunnel.config.proxyPort}`,
      });
      await fetch('http://example.com/hello');
      expect.fail('missed exception');
    } catch (err: any) {
      expect(err.message).to.include('Socket closed');
    }
  });

  context('with a non-HTTP target', function () {
    let netServer: Server;
    beforeEach(async function () {
      netServer = createServer((sock) =>
        sock.once('data', (chk) => sock.end('hello, ' + chk.toString() + '!')),
      );
      netServer.listen(0);
      await once(netServer, 'listening');
    });

    afterEach(async function () {
      netServer.close();
      await once(netServer, 'close');
    });

    // This simulates a number of aspects of using a PAC proxy with an actual MongoDB server
    it('can be used with a PAC proxy and a non-HTTP target', async function () {
      setup.pacFile = () => {
        return `function FindProxyForURL() { return 'HTTP 127.0.0.1:${setup.httpProxyPort}'; }`;
      };
      setup.httpProxyServer.removeAllListeners('connect');
      setup.httpProxyServer.on(
        'connect',
        (req: IncomingMessage, socket: Duplex, head: Buffer) => {
          socket.unshift(head);
          const [host, port] = req.url!.split(':');
          const outgoing = createConnection(+port, host);
          socket.write('HTTP/1.0 200 OK\r\n\r\n');
          socket.pipe(outgoing).pipe(socket);
        },
      );
      tunnel = await setupSocks5Tunnel(
        {
          useEnvironmentVariableProxies: true,
          env: {
            MONGODB_PROXY: `pac+http://foo:bar@127.0.0.1:${setup.httpServerPort}/pac`,
          },
        },
        {},
        'mongodb://',
      );
      if (!tunnel) {
        // regular conditional instead of assertion so that TS can follow it
        expect.fail('failed to create Socks5 tunnel');
      }

      const agent = createAgent({
        proxy: `socks5://127.0.0.1:${tunnel.config.proxyPort}`,
      });
      const socket = await connectThroughAgent({
        dstAddr: 'localhost',
        dstPort: (netServer.address() as AddressInfo).port,
        agent,
      });
      socket.write('world');
      let received = '';
      for await (const chunk of socket.setEncoding('utf8')) received += chunk;
      expect(received).to.equal('hello, world!');
    });
  });
});
