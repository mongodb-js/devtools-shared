import type { AgentConnectOpts } from 'agent-base';
import { Agent as AgentBase } from 'agent-base';
import type { DevtoolsProxyOptions } from './proxy-options';
import type { AgentWithInitialize } from './agent';
import type { ClientRequest } from 'http';
import type { Duplex } from 'stream';
import type { ClientChannel, ConnectConfig } from 'ssh2';
import { Client as SshClient } from 'ssh2';
import EventEmitter, { once } from 'events';
import { promises as fs } from 'fs';
import { promisify } from 'util';
import type { ProxyLogEmitter } from './logging';
import { connect as tlsConnect } from 'tls';
import type { Socket } from 'net';

// The original version of this code was largely taken from
// https://github.com/mongodb-js/compass/tree/55a5a608713d7316d158dc66febeb6b114d8b40d/packages/ssh-tunnel/src
export class SSHAgent extends AgentBase implements AgentWithInitialize {
  public logger: ProxyLogEmitter;
  public readonly proxyOptions: Readonly<DevtoolsProxyOptions>;
  private readonly url: URL;
  private sshClient: SshClient;
  private connected = false;
  private connectingPromise?: Promise<void>;
  private closed = false;
  private forwardOut: (
    srcIP: string,
    srcPort: number,
    dstIP: string,
    dstPort: number
  ) => Promise<ClientChannel>;

  constructor(options: DevtoolsProxyOptions, logger?: ProxyLogEmitter) {
    super();
    (this as AgentWithInitialize).on?.('error', () => {
      // Errors here should not crash the process
    });
    this.logger = logger ?? new EventEmitter();
    this.proxyOptions = options;
    this.url = new URL(options.proxy ?? '');
    this.sshClient = new SshClient();
    this.sshClient.on('close', () => {
      this.logger.emit('ssh:client-closed');
      this.connected = false;
    });

    this.forwardOut = promisify(this.sshClient.forwardOut.bind(this.sshClient));
  }

  async initialize(): Promise<void> {
    if (this.connected) {
      return;
    }

    if (this.connectingPromise) {
      return this.connectingPromise;
    }

    if (this.closed) {
      // A socks5 request could come in after we deliberately closed the connection. Don't reconnect in that case.
      throw new Error('Disconnected.');
    }

    const sshConnectConfig: ConnectConfig = {
      readyTimeout: 20000,
      keepaliveInterval: 20000,
      host: this.url.hostname,
      port: +this.url.port || 22,
      username: this.url.username || undefined,
      password: this.url.password || undefined,
      privateKey: this.proxyOptions.sshOptions?.identityKeyFile
        ? await fs.readFile(this.proxyOptions.sshOptions.identityKeyFile)
        : undefined,
      passphrase: this.proxyOptions.sshOptions?.identityKeyPassphrase,
      // debug: console.log.bind(null, '[client]')
    };

    this.logger.emit('ssh:establishing-conection', {
      host: sshConnectConfig.host,
      port: sshConnectConfig.port,
      password: !!sshConnectConfig.passphrase,
      privateKey: !!sshConnectConfig.privateKey,
      passphrase: !!sshConnectConfig.passphrase,
    });

    this.connectingPromise = Promise.race([
      once(this.sshClient, 'error').then(([err]) => {
        throw err;
      }),
      (() => {
        const waitForReady = once(this.sshClient, 'ready').then(() => {}); // eslint-disable-line @typescript-eslint/no-empty-function
        this.sshClient.connect(sshConnectConfig);
        return waitForReady;
      })(),
    ]);

    try {
      await this.connectingPromise;
    } catch (err) {
      (this as AgentWithInitialize).emit?.('error', err);
      this.logger.emit('ssh:failed-connection', {
        error: (err as any)?.stack ?? String(err),
      });
      delete this.connectingPromise;
      throw err;
    }

    delete this.connectingPromise;
    this.connected = true;
    this.logger.emit('ssh:established-connection');
  }

  override async connect(
    req: ClientRequest,
    connectOpts: AgentConnectOpts
  ): Promise<Duplex> {
    return await this._connect(req, connectOpts);
  }

  private async _connect(
    req: ClientRequest,
    connectOpts: AgentConnectOpts,
    retriesLeft = 1
  ): Promise<Duplex> {
    let host = '';
    try {
      // Using the `host` header matches what proxy-agent does
      host = connectOpts.host || (req.getHeader('host') as string);
      const url = new URL(req.path, `tcp://${host}:${connectOpts.port}`);

      await this.initialize();

      let sock: Duplex & Partial<Pick<Socket, 'setTimeout'>> =
        await this.forwardOut('127.0.0.1', 0, url.hostname, +url.port);
      (sock as any).setTimeout ??= function () {
        // noop, required for node-fetch
        return this;
      };
      if (connectOpts.secureEndpoint) {
        sock = tlsConnect({
          ...this.proxyOptions,
          ...connectOpts,
          socket: sock,
        });
      }
      return sock;
    } catch (err: unknown) {
      const retryableError = /Not connected|Channel open failure/.test(
        (err as Error).message
      );
      this.logger.emit('ssh:failed-forward', {
        host,
        error: String((err as Error).stack),
        retryableError,
        retriesLeft,
      });
      if (retryableError) {
        this.connected = false;
        if (retriesLeft > 0) {
          await this.initialize();
          return await this._connect(req, connectOpts, retriesLeft - 1);
        }
      }
      throw err;
    }
  }

  destroy(): void {
    this.closed = true;
    this.sshClient.end();
  }

  async interruptForTesting(): Promise<void> {
    this.sshClient.end();
    await once(this.sshClient, 'close');
  }
}
