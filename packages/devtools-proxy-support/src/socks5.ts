import { EventEmitter, once } from 'events';
import type { DevtoolsProxyOptions } from './proxy-options';
import { proxyForUrl } from './proxy-options';
import type { AgentWithInitialize } from './agent';
import { createAgent } from './agent';

// The socksv5 module is not bundle-able by itself, so we get the
// subpackages directly
import socks5Server from 'socksv5/lib/server';
import socks5AuthNone from 'socksv5/lib/auth/None';
import socks5AuthUserPassword from 'socksv5/lib/auth/UserPassword';
import { promisify } from 'util';
import { isIPv6 } from 'net';
import type { Socket } from 'net';
import type { Duplex } from 'stream';
import type { ClientRequest } from 'http';
import type { ProxyLogEmitter } from './logging';

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

  close(): Promise<void>;

  readonly config: Readonly<TunnelOptions>;
}

function createFakeHttpClientRequest(dstAddr: string, dstPort: number) {
  return {
    host: dstAddr,
    protocol: 'http',
    method: 'GET',
    path: '/',
    getHeader(name) {
      return name === 'host'
        ? `${isIPv6(dstAddr) ? `[${dstAddr}]` : dstAddr}:${dstPort}`
        : undefined;
    },
  } as ClientRequest;
}

class Socks5Server extends EventEmitter implements Tunnel {
  public logger: ProxyLogEmitter = new EventEmitter()
  private readonly agent: AgentWithInitialize;
  private server: any;
  private serverListen: (port?: number, host?: string) => Promise<void>;
  private serverClose: () => Promise<void>;
  private connections: Set<Socket> = new Set();
  private rawConfig: TunnelOptions;
  private closed = false;
  private agentInitialized = false;
  private agentInitPromise?: Promise<void>;

  constructor(agent: AgentWithInitialize, tunnelOptions: Partial<TunnelOptions>) {
    super();
    this.agent = agent;
    if (agent.logger)
      this.logger = agent.logger
    agent.on?.('error', (err: Error) => this.emit('forwardingError', err))
    this.rawConfig = getTunnelOptions(tunnelOptions);

    this.server = socks5Server.createServer(this.socks5Request.bind(this));

    if (this.rawConfig.proxyUsername) {
      this.server.useAuth(
        socks5AuthUserPassword(
          (user: string, pass: string, cb: (success: boolean) => void) => {
            const success =
              this.rawConfig.proxyUsername === user &&
              this.rawConfig.proxyPassword === pass;
            this.logger.emit('socks5:authentication-complete', {success});
            queueMicrotask(() => cb(success));
          }
        )
      );
    } else {
      this.logger.emit('socks5:skip-auth-setup');
      this.server.useAuth(socks5AuthNone());
    }

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
    const { proxyHost, proxyPort } = this.rawConfig;

    this.logger.emit('socks5:start-listening', { proxyHost, proxyPort })

    const listeningPromise = this.serverListen(proxyPort, proxyHost);
    try {
      await Promise.all([listeningPromise, this.ensureAgentInitialized()]);
      this.agentInitialized = true;
    } catch (err: unknown) {
      try {
        await listeningPromise;
      } finally {
        await this.close();
      }
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
      this.logger.emit('socks5:forwarding-error',
      { error: (err as any)?.stack ?? String(err) })
      delete this.agentInitPromise;
      await this.serverClose();
      throw err;
    }

    delete this.agentInitPromise;
    this.agentInitialized = true;
    this.logger.emit('socks5:agent-initialized')
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
    this.closed = true;

    this.logger.emit('socks5:closing-tunnel')
    const [maybeError] = await Promise.all([
      // If we catch anything, just return the error instead of throwing, we
      // want to await on closing the connections before re-throwing server
      // close error
      this.serverClose().catch<Error>((e) => e),
      this.agent.destroy?.(),
      this.closeOpenConnections(),
    ]);

    if (maybeError) {
      throw maybeError;
    }
  }

  private async forwardOut(dstAddr: string, dstPort: number): Promise<Duplex> {
    const channel = await promisify(this.agent.createSocket.bind(this.agent))(
      createFakeHttpClientRequest(dstAddr, dstPort),
      {
        host: dstAddr,
        port: dstPort,
      }
    );
    if (!channel)
      throw new Error(`Could not create channel to ${dstAddr}:${dstPort}`);
    return channel;
  }

  private async socks5Request(
    info: any,
    accept: (intercept: true) => Socket,
    deny: () => void
  ): Promise<void> {
    const { srcAddr, srcPort, dstAddr, dstPort } = info;
    const logMetadata = { srcAddr, srcPort, dstAddr, dstPort };
    this.logger.emit('socks5:got-forwarding-request', {...logMetadata});
    let socket: Socket | null = null;

    try {
      await this.ensureAgentInitialized();

      const channel = await this.forwardOut(dstAddr, dstPort);

      this.logger.emit('socks5:accepted-forwarding-request', {...logMetadata})

      socket = accept(true);
      this.connections.add(socket);

      socket.on('error', (err: ErrorWithOrigin) => {
        err.origin ??= 'connection';
        this.logger.emit('socks5:forwarding-error',
        {
          ...logMetadata,
          error: String((err as Error).stack),
        })
        this.emit('forwardingError', err);
      });

      socket.once('close', () => {
        this.logger.emit('socks5:forwarded-socket-closed', { ...logMetadata})
        this.connections.delete(socket as Socket);
      });

      socket.pipe(channel).pipe(socket);
    } catch (err) {
      this.emit('socks5:failed-forwarding-request',
      {
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

export async function setupSocks5Tunnel(
  proxyOptions: DevtoolsProxyOptions | AgentWithInitialize,
  tunnelOptions?: Partial<TunnelOptions>,
  target = 'mongodb://'
): Promise<Tunnel | undefined> {
  let agent: AgentWithInitialize;
  if ('createConnection' in proxyOptions) {
    agent = proxyOptions as AgentWithInitialize;
  } else {
    if (!proxyForUrl(proxyOptions as DevtoolsProxyOptions)(target))
      return undefined;
    agent = createAgent(proxyOptions as DevtoolsProxyOptions);
  }

  const server = new Socks5Server(agent, { ...tunnelOptions });
  await server.listen();
  return server;
}
