import { EventEmitter, once } from 'events';
import type { DevtoolsProxyOptions } from './proxy-options';
import { proxyForUrl } from './proxy-options';
import type { Agent } from 'https';
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

let idCounter = 0;
class Socks5Server extends EventEmitter implements Tunnel {
  private readonly agent: AgentWithInitialize;
  private server: any;
  private serverListen: (port?: number, host?: string) => Promise<void>;
  private serverClose: () => Promise<void>;
  private connections: Set<Socket> = new Set();
  private logCtx = `tunnel-${idCounter++}`;
  private rawConfig: TunnelOptions;
  private closed = false;
  private agentInitialized = false;
  private agentInitPromise?: Promise<void>;

  constructor(agent: Agent, tunnelOptions: Partial<TunnelOptions>) {
    super();
    this.agent = agent;
    this.rawConfig = getTunnelOptions(tunnelOptions);

    this.server = socks5Server.createServer(this.socks5Request.bind(this));

    if (this.rawConfig.proxyUsername) {
      this.server.useAuth(
        socks5AuthUserPassword(
          (user: string, pass: string, cb: (success: boolean) => void) => {
            const success =
              this.rawConfig.proxyUsername === user &&
              this.rawConfig.proxyPassword === pass;
            log.info(
              mongoLogId(1_001_000_253),
              this.logCtx,
              'Validated auth parameters',
              { success }
            );
            queueMicrotask(() => cb(success));
          }
        )
      );
    } else {
      log.info(mongoLogId(1_001_000_254), this.logCtx, 'Skipping auth setup');
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

    log.info(
      mongoLogId(1_001_000_255),
      this.logCtx,
      'Listening for Socks5 connections',
      { proxyHost, proxyPort }
    );

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
      debug('agent already connected');
      return;
    }

    if (this.agentInitPromise) {
      debug('reusing agentInitPromise');
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
      log.error(
        mongoLogId(1_001_000_258),
        this.logCtx,
        'Failed to establish new SSH connection',
        { error: (err as any)?.stack ?? String(err) }
      );
      delete this.agentInitPromise;
      await this.serverClose();
      throw err;
    }

    delete this.agentInitPromise;
    this.agentInitialized = true;
    log.info(
      mongoLogId(1_001_000_259),
      this.logCtx,
      'Finished establishing new SSH connection'
    );
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

    log.info(mongoLogId(1_001_000_256), this.logCtx, 'Closing SSH tunnel');
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
    log.info(
      mongoLogId(1_001_000_260),
      this.logCtx,
      'Received Socks5 fowarding request',
      {
        ...logMetadata,
      }
    );
    let socket: Socket | null = null;

    try {
      await this.ensureAgentInitialized();

      let channel: Duplex;
      try {
        channel = await this.forwardOut(dstAddr, dstPort);
      } catch (err) {
        // XXXX
        if ((err as Error).message === 'Not connected') {
          this.agentInitialized = false;
          log.error(
            mongoLogId(1_001_000_261),
            this.logCtx,
            'Error forwarding Socks5 request, retrying',
            {
              ...logMetadata,
              error: (err as Error).stack,
            }
          );
          await this.ensureAgentInitialized();
          channel = await this.forwardOut(dstAddr, dstPort);
        } else {
          throw err;
        }
      }

      log.info(
        mongoLogId(1_001_000_262),
        this.logCtx,
        'Opened SSH channel and accepting socks5 request',
        {
          ...logMetadata,
        }
      );

      socket = accept(true);
      this.connections.add(socket);

      socket.on('error', (err: ErrorWithOrigin) => {
        log.error(
          mongoLogId(1_001_000_263),
          this.logCtx,
          'Error on Socks5 stream socket',
          {
            ...logMetadata,
            error: (err as Error).stack,
          }
        );
        err.origin = err.origin ?? 'connection';
        this.emit('forwardingError', err);
      });

      socket.once('close', () => {
        log.info(
          mongoLogId(1_001_000_264),
          this.logCtx,
          'Socks5 stream socket closed',
          {
            ...logMetadata,
          }
        );
        this.connections.delete(socket as Socket);
      });

      socket.pipe(channel).pipe(socket);
    } catch (err) {
      this.emit('forwardingError', err);
      log.error(
        mongoLogId(1_001_000_265),
        this.logCtx,
        'Error establishing SSH channel for Socks5 request',
        {
          ...logMetadata,
          error: (err as Error).stack,
        }
      );
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
