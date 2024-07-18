import { Agent as AgentBase } from 'agent-base';
import type { DevtoolsProxyOptions } from './proxy-options';
import type { AgentWithInitialize } from './agent';
import type { ClientRequest } from 'http';
import type { Duplex } from 'stream';
import type { ClientChannel, ConnectConfig } from 'ssh2';
import { Client as SshClient } from 'ssh2';
import { once } from 'events';
import { promises as fs } from 'fs';

export class SSHAgent extends AgentBase implements AgentWithInitialize {
  private readonly proxyOptions: Readonly<DevtoolsProxyOptions>;
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

  constructor(options: DevtoolsProxyOptions) {
    super();
    this.proxyOptions = options;
    this.url = new URL(options.proxy ?? '');
    this.sshClient = new SshClient();
    this.sshClient.on('close', () => {
      log.info(mongoLogId(1_001_000_252), this.logCtx, 'sshClient closed');
      this.connected = false;
    });

    this.forwardOut = promisify(this.sshClient.forwardOut.bind(this.sshClient));
  }

  async initialize(): Promise<void> {
    if (this.connected) {
      debug('already connected');
      return;
    }

    if (this.connectingPromise) {
      debug('reusing connectingPromise');
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
    };

    log.info(
      mongoLogId(1_001_000_257),
      this.logCtx,
      'Establishing new SSH connection'
    );

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
      this.emit('forwardingError', err);
      log.error(
        mongoLogId(1_001_000_258),
        this.logCtx,
        'Failed to establish new SSH connection',
        { error: (err as any)?.stack ?? String(err) }
      );
      delete this.connectingPromise;
      throw err;
    }

    delete this.connectingPromise;
    this.connected = true;
    log.info(
      mongoLogId(1_001_000_259),
      this.logCtx,
      'Finished establishing new SSH connection'
    );
  }

  override async connect(req: ClientRequest): Promise<Duplex> {
    await this.initialize();

    const host = req.getHeader('host') as string;
    const url = new URL(req.path, `tcp://${host}`);

    return await this.forwardOut('127.0.0.1', 0, url.hostname, +url.port);
  }
}
