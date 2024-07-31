import { ProxyAgent } from 'proxy-agent';
import type { Agent } from 'https';
import type { DevtoolsProxyOptions } from './proxy-options';
import { proxyForUrl } from './proxy-options';
import type { ClientRequest, Agent as HTTPAgent } from 'http';
import type { TcpNetConnectOpts } from 'net';
import type { ConnectionOptions } from 'tls';
import type { Duplex } from 'stream';
import { SSHAgent } from './ssh';
import type { ProxyLogEmitter } from './logging';
import type { EventEmitter } from 'events';
import type { AgentConnectOpts } from 'agent-base';

// Helper type that represents an https.Agent (= connection factory)
// with some custom properties that TS does not know about and/or
// that we add for our own purposes.
export type AgentWithInitialize = Agent & {
  // This is genuinely custom for our usage (to allow establishing an SSH tunnel
  // first before starting to push connections through it)
  initialize?(): Promise<void>;
  logger?: ProxyLogEmitter;
  readonly proxyOptions?: Readonly<DevtoolsProxyOptions>;

  // This is just part of the regular Agent interface, used by Node.js itself,
  // but missing from @types/node
  createSocket(
    req: ClientRequest,
    options: TcpNetConnectOpts | ConnectionOptions,
    cb: (err: Error | null, s?: Duplex) => void
  ): void;

  // http.Agent is an EventEmitter, just missing from @types/node
} & Partial<EventEmitter>;

class DevtoolsProxyAgent extends ProxyAgent implements AgentWithInitialize {
  readonly proxyOptions: DevtoolsProxyOptions;
  private sshAgent: SSHAgent | undefined;

  // Store the current ClientRequest for the time between connect() first
  // being called and the corresponding _getProxyForUrl() being called.
  // In practice, this is instantaneous, but that is not guaranteed by
  // the `ProxyAgent` API contract.
  // We use a Promise lock/mutex to avoid concurrent accesses.
  private _req: ClientRequest | undefined;
  private _reqLock: Promise<void> | undefined;
  private _reqLockResolve: (() => void) | undefined;

  constructor(proxyOptions: DevtoolsProxyOptions) {
    super({
      ...proxyOptions,
      getProxyForUrl: (url: string) => this._getProxyForUrl(url),
    });
    this.proxyOptions = proxyOptions;
    // This could be made a bit more flexible by actually dynamically picking
    // ssh vs. other proxy protocols as part of connect(), if we want that at some point.
    if (proxyOptions.proxy && new URL(proxyOptions.proxy).protocol === 'ssh:') {
      this.sshAgent = new SSHAgent(proxyOptions);
    }
  }

  _getProxyForUrl = (url: string): string => {
    if (!this._reqLockResolve || !this._req) {
      throw new Error('getProxyForUrl() called without pending request');
    }
    this._reqLockResolve();
    const req = this._req;
    this._req = undefined;
    this._reqLock = undefined;
    this._reqLockResolve = undefined;
    return proxyForUrl(this.proxyOptions, url, req);
  };

  async initialize(): Promise<void> {
    await this.sshAgent?.initialize();
  }

  override async connect(
    req: ClientRequest,
    opts: AgentConnectOpts
  ): Promise<HTTPAgent> {
    if (this.sshAgent) return this.sshAgent;
    while (this._reqLock) {
      await this._reqLock;
    }
    this._req = req;
    this._reqLock = new Promise((resolve) => (this._reqLockResolve = resolve));
    return await super.connect(req, opts);
  }

  destroy(): void {
    this.sshAgent?.destroy();
    super.destroy();
  }
}

export function createAgent(
  proxyOptions: DevtoolsProxyOptions
): AgentWithInitialize {
  return new DevtoolsProxyAgent(proxyOptions);
}

export function useOrCreateAgent(
  proxyOptions: DevtoolsProxyOptions | AgentWithInitialize,
  target?: string
): AgentWithInitialize | undefined {
  if ('createConnection' in proxyOptions) {
    return proxyOptions as AgentWithInitialize;
  } else {
    if (
      target !== undefined &&
      !proxyForUrl(proxyOptions as DevtoolsProxyOptions, target)
    ) {
      return undefined;
    }
    return createAgent(proxyOptions as DevtoolsProxyOptions);
  }
}
