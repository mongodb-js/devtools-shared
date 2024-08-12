import { EventEmitter, once } from 'events';
import { getSocks5OnlyProxyOptions } from './proxy-options';
import type { DevtoolsProxyOptions } from './proxy-options';
import type { AgentWithInitialize } from './agent';
import { useOrCreateAgent } from './agent';

// The socksv5 module is not bundle-able by itself, so we get the
// subpackages directly
import socks5Server from '@mongodb-js/socksv5/lib/server';
import socks5AuthNone from '@mongodb-js/socksv5/lib/auth/None';
import socks5AuthUserPassword from '@mongodb-js/socksv5/lib/auth/UserPassword';
import { promisify } from 'util';
import { isIPv6 } from 'net';
import type { Socket } from 'net';
import type { Duplex } from 'stream';
import type { ClientRequest } from 'http';
import type { ProxyLogEmitter } from './logging';
import crypto from 'crypto';

const randomBytes = promisify(crypto.randomBytes);

export interface TunnelOptions {
  // These can safely be assigned to driver MongoClientOptinos
  proxyHost: string;
  proxyPort: number;
  proxyUsername?: string;
  proxyPassword?: string;
}

function getTunnelOptions(config: Partial<TunnelOptions>): TunnelOptions {
  return {
    proxyHost: '127.0.0.1',
    proxyPort: 0,
    proxyUsername: undefined,
    proxyPassword: undefined,
    ...config,
  };
}

type ErrorWithOrigin = Error & { origin?: string };

export interface Tunnel {
  readonly logger: ProxyLogEmitter;
  on(ev: 'forwardingError', cb: (err: Error) => void): void;
  on(ev: 'error', cb: (err: Error) => void): void;

  listen(): Promise<void>;
  close(): Promise<void>;

  readonly config: Readonly<TunnelOptions>;
}

function createFakeHttpClientRequest(
  dstAddr: string,
  dstPort: number,
  overrideProtocol: string | undefined
) {
  const headers: Record<string, string> = {
    host: `${isIPv6(dstAddr) ? `[${dstAddr}]` : dstAddr}:${dstPort}`,
    upgrade: 'websocket', // hack to make proxy-agent prefer CONNECT over HTTP proxying
  };
  return Object.assign(
    new EventEmitter().setMaxListeners(Infinity) as ClientRequest,
    {
      host: headers.host,
      protocol: 'http',
      method: 'GET',
      path: '/',
      getHeader(name: string) {
        return headers[name];
      },
      setHeader(name: string, value: string) {
        headers[name] = value;
      },
      _implicitHeader() {
        // Even some internal/non-public properties like this are required by http-proxy-agent:
        // https://github.com/TooTallNate/proxy-agents/blob/5555794b6d9e4b0a36fac80a2d3acea876a8f7dc/packages/http-proxy-agent/src/index.ts#L36
      },
      overrideProtocol,
    }
  );
}

export async function connectThroughAgent({
  dstAddr,
  dstPort,
  agent,
  overrideProtocol,
}: {
  dstAddr: string;
  dstPort: number;
  agent: AgentWithInitialize;
  overrideProtocol?: string | undefined;
}): Promise<Duplex> {
  const channel = await new Promise<Duplex | undefined>((resolve, reject) => {
    const req = createFakeHttpClientRequest(dstAddr, dstPort, overrideProtocol);
    req.onSocket = (sock) => {
      if (sock) resolve(sock);
    };
    agent.createSocket(
      req,
      {
        host: dstAddr,
        port: dstPort,
      },
      (err, sock) => {
        // Ideally, we would always be using this callback for retrieving the `sock`
        // instance. However, agent-base does not call the callback at all if
        // the agent resolved to another agent (as is the case for e.g. `ProxyAgent`).
        if (err) reject(err);
        else if (sock) resolve(sock);
        else
          reject(
            new Error(
              'Received neither error object nor socket from agent.createSocket()'
            )
          );
      }
    );
  });

  if (!channel)
    throw new Error(`Could not create channel to ${dstAddr}:${dstPort}`);
  return channel;
}

// The original version of this code was largely taken from
// https://github.com/mongodb-js/compass/tree/55a5a608713d7316d158dc66febeb6b114d8b40d/packages/ssh-tunnel/src
class Socks5Server extends EventEmitter implements Tunnel {
  public logger: ProxyLogEmitter = new EventEmitter().setMaxListeners(Infinity);
  private readonly agent: AgentWithInitialize;
  private server: any;
  private serverListen: (port?: number, host?: string) => Promise<void>;
  private serverClose: () => Promise<void>;
  private connections: Set<Socket> = new Set();
  private rawConfig: TunnelOptions;
  private generateCredentials: boolean;
  private overrideProtocol: string | undefined;
  private closed = true;
  private agentInitialized = false;
  private agentInitPromise?: Promise<void>;

  constructor(
    agent: AgentWithInitialize,
    tunnelOptions: Partial<TunnelOptions>,
    generateCredentials: boolean,
    overrideProtocol: string | undefined
  ) {
    super();
    this.setMaxListeners(Infinity);
    this.agent = agent;
    this.generateCredentials = generateCredentials;
    this.overrideProtocol = overrideProtocol;

    if (agent.logger) this.logger = agent.logger;
    agent.on?.('error', (err: Error) => this.emit('forwardingError', err));
    this.rawConfig = getTunnelOptions(tunnelOptions);

    this.server = socks5Server.createServer(this.socks5Request.bind(this));

    this.serverListen = promisify(this.server.listen.bind(this.server));
    this.serverClose = promisify(this.server.close.bind(this.server));

    for (const eventName of ['close', 'error', 'listening'] as const) {
      this.server.on(eventName, this.emit.bind(this, eventName));
    }
  }

  get config(): TunnelOptions {
    const serverAddress = this.server.address();

    return {
      ...this.rawConfig,
      proxyPort:
        (typeof serverAddress !== 'string' && serverAddress?.port) ||
        this.rawConfig.proxyPort,
    };
  }

  async listen(): Promise<void> {
    this.closed = false;
    if (this.generateCredentials) {
      const credentialsSource = await randomBytes(64);
      this.rawConfig = {
        ...this.rawConfig,
        proxyUsername: credentialsSource.slice(0, 32).toString('base64url'),
        proxyPassword: credentialsSource.slice(32).toString('base64url'),
      };
    }

    if (this.rawConfig.proxyUsername) {
      this.server.useAuth(
        socks5AuthUserPassword(
          (user: string, pass: string, cb: (success: boolean) => void) => {
            const success =
              this.rawConfig.proxyUsername === user &&
              this.rawConfig.proxyPassword === pass;
            this.logger.emit('socks5:authentication-complete', { success });
            queueMicrotask(() => cb(success));
          }
        )
      );
    } else {
      this.logger.emit('socks5:skip-auth-setup');
      this.server.useAuth(socks5AuthNone());
    }

    const { proxyHost, proxyPort } = this.rawConfig;

    this.logger.emit('socks5:start-listening', { proxyHost, proxyPort });

    const listeningPromise = this.serverListen(proxyPort, proxyHost);
    try {
      await Promise.all([
        listeningPromise,
        once(this, 'listening'),
        this.ensureAgentInitialized(),
      ]);
      this.agentInitialized = true;
    } catch (err: unknown) {
      await this.close();
      throw err;
    }
  }

  private async ensureAgentInitialized() {
    if (this.agentInitialized) {
      return;
    }

    if (this.agentInitPromise) {
      return this.agentInitPromise;
    }

    if (this.closed) {
      // A socks5 request could come in after we deliberately closed the connection. Don't reconnect in that case.
      throw new Error('Disconnected.');
    }

    try {
      await (this.agentInitPromise = this.agent.initialize?.());
    } catch (err) {
      this.emit('forwardingError', err);
      this.logger.emit('socks5:forwarding-error', {
        error: (err as any)?.stack ?? String(err),
      });
      delete this.agentInitPromise;
      await this.serverClose();
      throw err;
    }

    delete this.agentInitPromise;
    this.agentInitialized = true;
    this.logger.emit('socks5:agent-initialized');
  }

  private async closeOpenConnections() {
    const waitForClose: Promise<unknown[]>[] = [];
    for (const socket of this.connections) {
      waitForClose.push(once(socket, 'close'));
      socket.destroy();
    }
    await Promise.all(waitForClose);
    this.connections.clear();
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;

    this.logger.emit('socks5:closing-tunnel');
    const [maybeError] = await Promise.all([
      // If we catch anything, just return the error instead of throwing, we
      // want to await on closing the connections before re-throwing server
      // close error
      this.serverClose().catch<Error>((e) => e),
      this.agent.destroy?.(),
      this.closeOpenConnections(),
    ]);

    if (
      maybeError &&
      !('code' in maybeError && maybeError.code === 'ERR_SERVER_NOT_RUNNING')
    ) {
      throw maybeError;
    }
  }

  private async forwardOut(dstAddr: string, dstPort: number): Promise<Duplex> {
    return await connectThroughAgent({
      dstAddr,
      dstPort,
      agent: this.agent,
      overrideProtocol: this.overrideProtocol,
    });
  }

  private async socks5Request(
    info: any,
    accept: (intercept: true) => Socket,
    deny: () => void
  ): Promise<void> {
    const { srcAddr, srcPort, dstAddr, dstPort } = info;
    const logMetadata = { srcAddr, srcPort, dstAddr, dstPort };
    this.logger.emit('socks5:got-forwarding-request', { ...logMetadata });
    let socket: Socket | null = null;

    try {
      await this.ensureAgentInitialized();

      const channel = await this.forwardOut(dstAddr, dstPort);

      this.logger.emit('socks5:accepted-forwarding-request', {
        ...logMetadata,
      });

      socket = accept(true);
      this.connections.add(socket);
      const forwardingErrorHandler = (err: ErrorWithOrigin) => {
        if (!socket?.writableEnded) socket?.end();
        if (!channel?.writableEnded) channel?.end();
        err.origin ??= 'connection';
        this.logger.emit('socks5:forwarding-error', {
          ...logMetadata,
          error: String((err as Error).stack),
        });
        this.emit('forwardingError', err);
      };

      channel.on('error', forwardingErrorHandler);
      socket.on('error', forwardingErrorHandler);

      socket.once('close', () => {
        this.logger.emit('socks5:forwarded-socket-closed', { ...logMetadata });
        this.connections.delete(socket as Socket);
      });

      socket.pipe(channel).pipe(socket);
    } catch (err) {
      this.emit('socks5:failed-forwarding-request', {
        ...logMetadata,
        error: String((err as Error).stack),
      });
      this.emit('forwardingError', err);
      deny();
      if (socket) {
        (err as any).origin = 'ssh-client';
        socket.destroy(err as any);
      }
    }
  }
}

class ExistingTunnel extends EventEmitter {
  logger = new EventEmitter().setMaxListeners(Infinity);
  readonly config: TunnelOptions;

  constructor(config: TunnelOptions) {
    super();
    this.setMaxListeners(Infinity);
    this.config = config;
  }

  async listen() {
    // nothing to do if we didn't start a server
  }

  async close() {
    // nothing to do if we didn't start a server
  }
}

// Open a local Socks5 server, which accepts incoming connections and forwards them
// using the proxy specified in `proxyOptions`. `tunnelOptions` may specify an
// address to listen on, as well as credentials for the server. Passing
// `generate-credentials` will lead to random credentials being generated as part of
// `server.listen()`. `target` should specify an URL which is used for determining
// which proxy to use, and in particular the protocol specified will be used
// for determining this proxy.
export function createSocks5Tunnel(
  proxyOptions: DevtoolsProxyOptions | AgentWithInitialize,
  tunnelOptions?: Partial<TunnelOptions> | 'generate-credentials',
  target?: string | undefined
): Tunnel | undefined {
  const socks5OnlyProxyOptions = getSocks5OnlyProxyOptions(
    ('proxyOptions' in proxyOptions
      ? proxyOptions.proxyOptions
      : proxyOptions) as DevtoolsProxyOptions,
    target
  );
  if (socks5OnlyProxyOptions) {
    return new ExistingTunnel(socks5OnlyProxyOptions);
  }

  const agent = useOrCreateAgent(proxyOptions, target);
  if (!agent) return undefined;

  let generateCredentials = false;
  if (tunnelOptions === 'generate-credentials') {
    tunnelOptions = {};
    generateCredentials = true;
  }

  return new Socks5Server(
    agent,
    { ...tunnelOptions },
    generateCredentials,
    target ? new URL(target).protocol : undefined
  );
}
