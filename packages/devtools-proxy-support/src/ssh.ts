import type { AgentConnectOpts } from 'agent-base';
import { Agent as AgentBase } from 'agent-base';
import type { DevtoolsProxyOptions } from './proxy-options';
import type { AgentWithInitialize } from './agent';
import type { ClientRequest } from 'http';
import type { Duplex } from 'stream';
import type { ClientChannel, ConnectConfig, Client as SshClient } from 'ssh2';
import EventEmitter, { once } from 'events';
import { promises as fs } from 'fs';
import { promisify } from 'util';
import type { ProxyLogEmitter } from './logging';
import { connect as tlsConnect } from 'tls';
import type { Socket } from 'net';
import { getFips } from 'crypto';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
function ssh2(): typeof import('ssh2') {
  if (getFips()) {
    // ssh2 uses a WASM implementation of the non-FIPS-compliant Poly1305 hash algorithm
    throw new Error(
      'devtools-proxy-support: Using `ssh2` features in FIPS mode is currently not available',
    );
  }
  // Lazily loading this package because it uses WebAssembly and therefore cannot
  // be included in startup snapshots, and generally adds unnecessary loading time
  // to the application.
  return require('ssh2');
}

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
  private forwardOut!: (
    srcIP: string,
    srcPort: number,
    dstIP: string,
    dstPort: number,
  ) => Promise<ClientChannel>;

  constructor(options: DevtoolsProxyOptions, logger?: ProxyLogEmitter) {
    super();
    (this as AgentWithInitialize).on?.('error', () => {
      // Errors here should not crash the process
    });
    this.logger = logger ?? new EventEmitter().setMaxListeners(Infinity);
    this.proxyOptions = options;
    this.url = new URL(options.proxy ?? '');
    this.sshClient = this.createSshClient();
  }

  private createSshClient(): SshClient {
    const client = new (ssh2().Client)();
    client.on('close', () => {
      this.logger.emit('ssh:client-closed');
      this.connected = false;
    });
    client.on('error', () => {
      // Errors during connection setup are handled through initialize()'s
      // connectingPromise race, and post-connection errors through _connect()'s
      // catch block. This listener prevents unhandled 'error' events from
      // crashing the process when the SSH session dies unexpectedly (e.g. after
      // the host machine resumes from hibernate).
      this.connected = false;
    });
    this.forwardOut = promisify(client.forwardOut.bind(client));
    return client;
  }

  async initialize(reinitializeClient = false): Promise<void> {
    if (this.connected && !reinitializeClient) {
      return;
    }

    if (this.connectingPromise && !reinitializeClient) {
      return this.connectingPromise;
    }

    if (this.closed) {
      // A socks5 request could come in after we deliberately closed the connection. Don't reconnect in that case.
      throw new Error('Disconnected.');
    }

    if (reinitializeClient) {
      // The previous ssh2 Client instance is in an unrecoverable state (e.g.
      // "Instance unusable after fatal error" after the TCP connection was killed
      // mid-stream during hibernate). Discard it and create a fresh one.
      // We do not call end() here: the underlying socket is already dead
      // (forceful RST or broken parser), and calling end() on it may emit
      // unhandled socket-level errors.
      this.connectingPromise = undefined;
      this.connected = false;
      this.sshClient = this.createSshClient();
    }

    const sshConnectConfig: ConnectConfig = {
      readyTimeout: 20000,
      keepaliveInterval: 20000,
      host: decodeURIComponent(this.url.hostname),
      port: +this.url.port || 22,
      username: decodeURIComponent(this.url.username) || undefined,
      password: decodeURIComponent(this.url.password) || undefined,
      privateKey: this.proxyOptions.sshOptions?.identityKeyFile
        ? await fs.readFile(this.proxyOptions.sshOptions.identityKeyFile)
        : undefined,
      passphrase: this.proxyOptions.sshOptions?.identityKeyPassphrase,
      // debug: console.log.bind(null, '[client]')
    };

    this.logger.emit('ssh:establishing-conection', {
      host: sshConnectConfig.host,
      port: sshConnectConfig.port,
      password: !!sshConnectConfig.password,
      privateKey: !!sshConnectConfig.privateKey,
      passphrase: !!sshConnectConfig.passphrase,
    });

    this.connectingPromise = Promise.race([
      once(this.sshClient, 'error').then(([err]) => {
        throw err;
      }),
      (() => {
        const waitForReady = once(this.sshClient, 'ready').then(
          () => undefined,
        );
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
      this.connectingPromise = undefined;
      throw err;
    }

    this.connectingPromise = undefined;
    this.connected = true;
    this.logger.emit('ssh:established-connection');
  }

  override async connect(
    req: ClientRequest,
    connectOpts: AgentConnectOpts,
  ): Promise<Duplex> {
    return await this._connect(req, connectOpts);
  }

  private async _connect(
    req: ClientRequest,
    connectOpts: AgentConnectOpts,
    retriesLeft = 1,
  ): Promise<Duplex> {
    let host = '';
    let initializedSuccessfully = false;
    try {
      // Using the `host` header matches what proxy-agent does
      host = connectOpts.host || (req.getHeader('host') as string);
      const url = new URL(req.path, `tcp://${host}:${connectOpts.port}`);

      await this.initialize();
      initializedSuccessfully = true;

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
      // If initialize() itself failed, the ssh2 Client instance may be in a
      // broken state (e.g. after a forceful TCP reset during hibernate) and
      // needs to be recreated before the next attempt.
      const requiresNewClient =
        !initializedSuccessfully ||
        /Instance unusable after fatal error/.test((err as Error).message);
      const retryableError =
        requiresNewClient ||
        /Not connected|Channel open failure|read ECONNRESET|Socket closed/.test(
          (err as Error).message,
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
          await this.initialize(requiresNewClient);
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
