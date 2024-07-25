import { expect } from 'chai';
import type { DevtoolsProxyOptions } from './proxy-options';
import {
  extractProxySecrets,
  mergeProxySecrets,
  proxyConfForEnvVars,
  proxyForUrl,
  redactUrl,
  translateToElectronProxyConfig,
} from './proxy-options';
import type { ChildProcess } from 'child_process';
import { spawn } from 'child_process';
import path from 'path';
import { once } from 'events';
import type { AddressInfo, Server, Socket } from 'net';
import { createServer } from 'net';
import { HTTPServerProxyTestSetup } from '../test/helpers';

describe('proxy options handling', function () {
  describe('proxyConfForEnvVars', function () {
    it('should return a map listing configured proxies and no-proxy hosts', function () {
      const env = {
        HTTP_PROXY: 'http://proxy.example.com',
        HTTPS_PROXY: 'https://proxy.example.com',
        NO_PROXY: 'localhost,127.0.0.1',
      };

      const { map, noProxy } = proxyConfForEnvVars(env);

      expect([...map]).to.deep.equal([
        ['http', 'http://proxy.example.com'],
        ['https', 'https://proxy.example.com'],
      ]);
      expect(noProxy).to.equal('localhost,127.0.0.1');
    });
  });

  describe('proxyForUrl', function () {
    it('should return a proxy function for a specified proxy URL', function () {
      const getProxy = proxyForUrl.bind(null, {
        proxy: 'http://proxy.example.com',
      });

      expect(getProxy('http://target.com')).to.equal(
        'http://proxy.example.com'
      );
    });

    it('should respect noProxyHosts', function () {
      const getProxy = proxyForUrl.bind(null, {
        proxy: 'http://proxy.example.com',
        noProxyHosts: 'localhost',
      });

      expect(getProxy('http://localhost')).to.equal('');
      expect(getProxy('http://example.com')).to.equal(
        'http://proxy.example.com'
      );
    });

    it('should use environment variables as a fallback', function () {
      const getProxy = proxyForUrl.bind(null, {
        useEnvironmentVariableProxies: true,
        env: {
          HTTP_PROXY: 'socks5://env-proxy.example.com',
          NO_PROXY: 'localhost',
          ALL_PROXY: 'http://fallback.example.com',
        },
      });

      expect(getProxy('http://localhost')).to.equal('');
      expect(getProxy('http://localhost:12345')).to.equal('');
      expect(getProxy('http://example.com')).to.equal(
        'socks5://env-proxy.example.com'
      );
      expect(getProxy('mongodb://example.com')).to.equal(
        'http://fallback.example.com'
      );
    });
  });

  describe('electron options transformation', function () {
    context('unit tests', function () {
      it('rejects ssh proxies', function () {
        expect(() =>
          translateToElectronProxyConfig({ proxy: 'ssh://proxy.example.com' })
        ).to.throw(
          /Using ssh:\/\/ proxies for generic browser proxy usage is not supported/
        );
      });
      it('rejects authenticated proxies', function () {
        expect(() =>
          translateToElectronProxyConfig({
            proxy: 'http://foo:bar@proxy.example.com',
          })
        ).to.throw(
          /Using authenticated proxies for generic browser proxy usage is not supported/
        );
      });
      it('rejects unsupported proxy protocols', function () {
        expect(() =>
          translateToElectronProxyConfig({ proxy: 'meow://proxy.example.com' })
        ).to.throw(/Unsupported proxy protocol/);
      });
      it('translates a pac file proxy to the corresponding electron config', function () {
        expect(
          translateToElectronProxyConfig({
            proxy: 'pac+http://example.com/pac',
          })
        ).to.deep.equal({
          mode: 'pac_script',
          pacScript: 'http://example.com/pac',
          proxyBypassRules: undefined,
        });
      });
      it('translates a http proxy to the corresponding electron config', function () {
        expect(
          translateToElectronProxyConfig({
            proxy: 'http://example.com/',
            noProxyHosts: 'localhost,example.com',
          })
        ).to.deep.equal({
          mode: 'fixed_servers',
          proxyBypassRules: 'localhost,example.com',
          proxyRules: 'http://example.com',
        });
      });
      it('translates an env var proxy config to the corresponding electron config', function () {
        expect(
          translateToElectronProxyConfig({
            useEnvironmentVariableProxies: true,
            noProxyHosts: 'localhost,example.com',
            env: {
              HTTP_PROXY: 'socks5://env-proxy.example.com',
              NO_PROXY: 'zombo.com',
              ALL_PROXY: 'http://fallback.example.com',
            },
          })
        ).to.deep.equal({
          mode: 'fixed_servers',
          proxyBypassRules: 'localhost,example.com,zombo.com',
          proxyRules:
            'http=socks5://env-proxy.example.com;https=http://fallback.example.com;ftp=http://fallback.example.com',
        });
      });
      it('translates an empty config to an empty config', function () {
        expect(translateToElectronProxyConfig({})).to.deep.equal({});
        expect(
          translateToElectronProxyConfig({
            useEnvironmentVariableProxies: true,
            env: {},
          })
        ).to.deep.equal({});
      });
    });

    context('integration tests', function () {
      // These are some integration tests that leverage the fact that
      // Electron can be used as a script runner to verify that our generated
      // Electron proxyh configuration actually behaves the way it is intended to.

      let childProcess: ChildProcess;
      let exitPromise: Promise<unknown>;
      let server: Server;
      let socket: Socket;
      let runJS: (js: string) => Promise<any>;
      let testResolveProxy: (
        proxyOptions: DevtoolsProxyOptions,
        url: string,
        expectation: string
      ) => Promise<void>;
      let setup: HTTPServerProxyTestSetup;

      before(async function () {
        if (process.platform === 'win32' && process.env.CI) {
          return this.skip();
        }
        setup = new HTTPServerProxyTestSetup();
        await setup.listen();

        // Use a TCP connection for communication with the electron process;
        // see electron-test-server.js for details.
        server = createServer();
        server.listen(0);
        await once(server, 'listening');
        const connEvent = once(server, 'connection');
        childProcess = spawn(
          'npx',
          [
            'xvfb-maybe',
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            require('electron') as unknown as string,
            path.resolve(__dirname, '..', 'test', 'electron-test-server.js'),
          ],
          {
            env: {
              ...process.env,
              TEST_SERVER_PORT: String((server.address() as AddressInfo).port),
            },
            stdio: 'inherit',
          }
        );
        exitPromise = once(childProcess, 'exit').catch(() => {
          // ignore unhandledRejection warning/error
        });
        await once(childProcess, 'spawn');

        [socket] = await connEvent;
        socket.setEncoding('utf8');
        let buffer = '';
        socket.on('data', (chunk) => (buffer += chunk));

        runJS = async (js: string) => {
          socket.write(JSON.stringify(js) + '\0');
          while (!buffer.includes('\0')) {
            await once(socket, 'data');
          }
          const response = buffer.substring(0, buffer.indexOf('\0'));
          buffer = buffer.substring(buffer.indexOf('\0') + 1);
          return JSON.parse(response);
        };

        testResolveProxy = async (proxyOptions, url, expectation) => {
          const config = translateToElectronProxyConfig(proxyOptions);
          // https://www.electronjs.org/docs/latest/api/app#appsetproxyconfig
          // https://www.electronjs.org/docs/latest/api/app#appresolveproxyurl
          const actual = await runJS(`app.setProxy(${JSON.stringify(
            config
          )}).then(_ => {
            return app.resolveProxy(${JSON.stringify(url)});
          })`);
          expect({ actual, config }).to.have.property('actual', expectation);
        };
      });

      after(async function () {
        childProcess?.kill?.();
        socket?.destroy?.();
        server?.close?.();
        await Promise.all([
          socket && once(socket, 'close'),
          server && once(server, 'close'),
          exitPromise,
          setup?.teardown?.(),
        ]);
      });

      it('correctly handles explicit proxies', async function () {
        await testResolveProxy(
          {
            proxy: 'http://example.com:12345',
          },
          'http://example.net',

          'PROXY example.com:12345'
        );

        await testResolveProxy(
          {
            proxy: 'http://example.com:12345',
            noProxyHosts: 'localhost',
          },
          'http://example.net',

          'PROXY example.com:12345'
        );

        await testResolveProxy(
          {
            proxy: 'http://example.com:12345',
            noProxyHosts: 'localhost',
          },
          'http://localhost',

          'DIRECT'
        );

        await testResolveProxy(
          {
            proxy: 'http://example.com:12345',
            noProxyHosts: 'localhost',
          },
          'http://localhost:1234',

          'DIRECT'
        );

        await testResolveProxy(
          {
            proxy: 'socks5://example.com:12345',
          },
          'http://example.net',

          'SOCKS5 example.com:12345'
        );
      });

      it('correctly handles pac-script-specified proxies', async function () {
        await testResolveProxy(
          {
            proxy: `pac+http://127.0.0.1:${setup.httpServerPort}/pac`,
          },
          'http://example.com',

          `SOCKS5 127.0.0.1:${setup.socks5ProxyPort}`
        );

        await testResolveProxy(
          {
            proxy: `pac+http://127.0.0.1:${setup.httpServerPort}/pac`,
          },
          'http://pac-invalidproxy/test',

          `SOCKS5 127.0.0.1:1`
        );
      });

      it('correctly handles environment-specified proxies', async function () {
        const config: DevtoolsProxyOptions = {
          env: {
            HTTP_PROXY: 'https://http-proxy.example.net',
            HTTPS_PROXY: 'http://https-proxy.example.net',
            NO_PROXY: 'example.net:1234,example.com',
          },
          noProxyHosts: 'example.net:4567',
          useEnvironmentVariableProxies: true,
        };
        await testResolveProxy(config, 'http://localhost', 'DIRECT');
        await testResolveProxy(
          config,
          'http://example.net',
          'HTTPS http-proxy.example.net:443'
        );
        await testResolveProxy(
          config,
          'https://example.net',
          'PROXY https-proxy.example.net:80'
        );

        await testResolveProxy(config, 'https://example.net:1234', 'DIRECT');

        await testResolveProxy(config, 'https://example.net:4567', 'DIRECT');

        await testResolveProxy(
          config,
          'https://example.net:9801',
          'PROXY https-proxy.example.net:80'
        );
        await testResolveProxy(config, 'https://example.com', 'DIRECT');
        await testResolveProxy(
          {
            ...config,
            env: {
              ...config.env,
              ALL_PROXY: 'http://fallback.example.com:1',
            },
          },
          'ftp://mongodb.net',

          'PROXY fallback.example.com:1'
        );
      });
    });
  });

  describe('secrets management', function () {
    it('can extract and re-merge secrets for proxy options', function () {
      const options: DevtoolsProxyOptions = {
        proxy: 'ssh://username:password@host.example.net/',
        sshOptions: {
          identityKeyFile: '/file.key',
          identityKeyPassphrase: 'secret',
        },
      };
      expect(extractProxySecrets(options)).to.deep.equal({
        proxyOptions: {
          proxy: 'ssh://username@host.example.net/',
          sshOptions: {
            identityKeyFile: '/file.key',
            identityKeyPassphrase: undefined,
          },
        },
        secrets: '{"password":"password","sshIdentityKeyPassphrase":"secret"}',
      });
      expect(mergeProxySecrets(extractProxySecrets(options))).to.deep.equal(
        options
      );
    });

    it('can redact URL passwords', function () {
      expect(redactUrl('ssh://username:password@host.example.net/')).to.equal(
        'ssh://username:(credential)@host.example.net/'
      );
    });
  });
});
