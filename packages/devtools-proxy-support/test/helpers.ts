import { once } from 'events';
import { readFileSync } from 'fs';
import type {
  Server as HTTPServer,
  IncomingMessage,
  RequestListener,
} from 'http';
import type { Server as HTTPSServer } from 'https';
import { createServer as createHTTPSServer } from 'https';
import type { AddressInfo, Server, Socket } from 'net';
import path from 'path';
import { createServer as createHTTPServer, get as httpGet } from 'http';
import type { TcpipRequestInfo } from 'ssh2';
import { Server as SSHServer } from 'ssh2';
import DuplexPair from 'duplexpair';

import socks5Server from 'socksv5/lib/server';
import { promisify } from 'util';

function parseHTTPAuthHeader(header: string | undefined): [string, string] {
  if (!header?.startsWith('Basic ')) return ['', ''];
  const [username = '', pw = ''] = Buffer.from(header.split(' ')[1], 'base64')
    .toString()
    .split(':');
  return [username, pw];
}

export class HTTPServerProxyTestSetup {
  // Target servers: These actually handle requests.
  readonly httpServer: HTTPServer;
  readonly httpsServer: HTTPSServer;
  // Proxy servers:
  readonly socks5ProxyServer: Server & { useAuth: any };
  readonly httpProxyServer: HTTPServer;
  readonly httpsProxyServer: HTTPServer;
  readonly sshServer: SSHServer;
  readonly sshTunnelInfos: TcpipRequestInfo[] = [];
  canTunnel = true;
  authHandler: undefined | ((username: string, password: string) => boolean);

  get httpServerPort(): number {
    return (this.httpServer.address() as AddressInfo).port;
  }
  get httpsServerPort(): number {
    return (this.httpsServer.address() as AddressInfo).port;
  }
  get socks5ProxyPort(): number {
    return (this.socks5ProxyServer.address() as AddressInfo).port;
  }
  get httpProxyPort(): number {
    return (this.httpProxyServer.address() as AddressInfo).port;
  }
  get httpsProxyPort(): number {
    return (this.httpsProxyServer.address() as AddressInfo).port;
  }
  get sshProxyPort(): number {
    return (this.sshServer.address() as AddressInfo).port;
  }

  requests: IncomingMessage[];
  tlsOptions = Object.freeze({
    key: readFileSync(path.resolve(__dirname, 'fixtures', 'server.bundle.pem')),
    cert: readFileSync(
      path.resolve(__dirname, 'fixtures', 'server.bundle.pem')
    ),
    ca: readFileSync(path.resolve(__dirname, 'fixtures', 'ca.crt')),
    sshdKey: readFileSync(path.resolve(__dirname, 'fixtures', 'sshd.key')),
  });

  constructor() {
    this.requests = [];
    const handler: RequestListener = (req, res) => {
      this.requests.push(req);
      res.writeHead(200);
      res.end(`OK ${req.url ?? ''}`);
    };
    this.httpServer = createHTTPServer(handler);
    this.httpsServer = createHTTPSServer({ ...this.tlsOptions }, handler);

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    this.socks5ProxyServer = (socks5Server as any).createServer(
      (
        info: any,
        accept: (intercept: true) => Socket
        //deny: () => void
      ): void => {
        const socket = accept(true);
        this.httpServer.emit('connection', socket);
      }
    );

    this.httpProxyServer = createHTTPServer((req, res) => {
      const [username, pw] = parseHTTPAuthHeader(
        req.headers['proxy-authorization']
      );
      if (this.authHandler?.(username, pw) === false) {
        res.writeHead(407);
        res.end();
        return;
      }
      httpGet(
        req.url!,
        {
          createConnection: () => {
            const { socket1, socket2 } = new DuplexPair();
            this.httpServer.emit('connection', socket2);
            return socket1;
          },
        },
        (proxyRes) => proxyRes.pipe(res)
      );
    });

    this.httpsProxyServer = createHTTPServer(() => {
      throw new Error('should not use normal req/res handler');
    }).on('connect', (req, socket, head) => {
      const [username, pw] = parseHTTPAuthHeader(
        req.headers['proxy-authorization']
      );
      if (this.authHandler?.(username, pw) === false) {
        socket.end('HTTP/1.0 407 Proxy Authentication Required\r\n\r\n');
        return;
      }
      socket.unshift(head);
      this.httpsServer.emit('connection', socket);
      socket.write('HTTP/1.0 200 OK\r\n\r\n');
    });

    this.sshServer = new SSHServer(
      {
        hostKeys: [this.tlsOptions.sshdKey],
      },
      (client) => {
        client
          .on('authentication', (ctx) => {
            if (ctx.method === 'none' && !this.authHandler) return ctx.accept();
            if (
              ctx.method === 'password' &&
              this.authHandler?.(ctx.username, ctx.password)
            )
              return ctx.accept();
            return ctx.reject();
          })
          .on('ready', () => {
            client.on('tcpip', (accept, reject, info) => {
              if (!this.canTunnel) {
                return reject();
              }
              this.sshTunnelInfos.push(info);
              this.httpServer.emit('connection', accept());
            });
          });
      }
    );
  }

  async listen(): Promise<void> {
    await Promise.all(
      [
        this.httpServer,
        this.httpsServer,
        this.socks5ProxyServer,
        this.httpProxyServer,
        this.httpsProxyServer,
        this.sshServer,
      ].map((server) => promisify(server.listen.bind(server))(0))
    );
  }

  getRequestedUrls() {
    return this.requests.map((r) =>
      Object.assign(new URL(`http://_`), {
        pathname: r.url,
        host: r.headers.host,
      }).toString()
    );
  }

  async teardown() {
    const closePromises: Promise<unknown>[] = [];
    for (const server of [
      this.httpServer,
      this.httpsServer,
      this.socks5ProxyServer,
      this.httpProxyServer,
      this.httpsProxyServer,
    ]) {
      server.close();
      closePromises.push(once(server, 'close'));
    }
    this.sshServer.close(); // Doesn't emit 'close'
    await Promise.all(closePromises);
  }
}
