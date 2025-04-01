import { ProxyAgent } from './proxy-agent';
import type { Agent as HTTPSAgent } from 'https';
import type { DevtoolsProxyOptions } from './proxy-options';
import { proxyForUrl } from './proxy-options';
import type { ClientRequest } from 'http';
import { Agent as HTTPAgent } from 'http';
import type { TcpNetConnectOpts } from 'net';
import type { ConnectionOptions, SecureContextOptions } from 'tls';
import type { Duplex } from 'stream';
import { SSHAgent } from './ssh';
import type { ProxyLogEmitter } from './logging';
import { EventEmitter } from 'events';
import type { AgentConnectOpts } from 'agent-base';
import { Agent as AgentBase } from 'agent-base';
import { mergeCA, systemCA } from './system-ca';

// Helper type that represents an https.Agent (= connection factory)
// with some custom properties that TS does not know about and/or
// that we add for our own purposes.
export type AgentWithInitialize = HTTPSAgent & {
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
    cb: (err: Error | null, s?: Duplex) => void,
  ): void;

  // http.Agent is an EventEmitter, just missing from @types/node
} & Partial<EventEmitter>;

class DevtoolsProxyAgent extends ProxyAgent implements AgentWithInitialize {
  readonly proxyOptions: DevtoolsProxyOptions;
  logger: ProxyLogEmitter;
  private sshAgent: SSHAgent | undefined;

  // Store the current ClientRequest for the time between connect() first
  // being called and the corresponding _getProxyForUrl() being called.
  // In practice, this is instantaneous, but that is not guaranteed by
  // the `ProxyAgent` API contract.
  // We use a Promise lock/mutex to avoid concurrent accesses.
  private _req: ClientRequest | undefined;
  private _reqLock: Promise<void> | undefined;
  private _reqLockResolve: (() => void) | undefined;

  // allowPartialTrustChain listed here until the Node.js types have it
  constructor(
    proxyOptions: DevtoolsProxyOptions & { allowPartialTrustChain?: boolean },
    logger: ProxyLogEmitter,
  ) {
    // NB: The Node.js HTTP agent implementation overrides request options
    // with agent options. Ideally, we'd want to merge them, but it seems like
    // there is little we can do about it at this point.
    // None of our products need the ability to specify per-request CA options
    // currently anyway.
    // https://github.com/nodejs/node/blob/014dad5953a632f44e668f9527f546c6e1bb8b86/lib/_http_agent.js#L239
    super({
      ...proxyOptions,
      getProxyForUrl: (url: string) => this._getProxyForUrl(url),
    });

    this.logger = logger;
    this.proxyOptions = proxyOptions;
    // This could be made a bit more flexible by actually dynamically picking
    // ssh vs. other proxy protocols as part of connect(), if we want that at some point.
    if (proxyOptions.proxy && new URL(proxyOptions.proxy).protocol === 'ssh:') {
      this.sshAgent = new SSHAgent(proxyOptions, logger);
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
    opts: AgentConnectOpts & Partial<SecureContextOptions>,
  ): Promise<HTTPAgent> {
    opts.ca = mergeCA(this.proxyOptions.ca, opts.ca); // see constructor
    if (this.sshAgent) return this.sshAgent;
    while (this._reqLock) {
      await this._reqLock;
    }
    this._req = req;
    this._reqLock = new Promise((resolve) => (this._reqLockResolve = resolve));
    const agent = await super.connect(req, opts);
    // Work around https://github.com/TooTallNate/proxy-agents/pull/330
    if ('addRequest' in agent && typeof agent.addRequest === 'function') {
      const dummyHttpAgent = Object.assign(new HTTPAgent(), {
        addRequest() {
          //ignore
        },
      });
      agent.addRequest(req, opts);
      return dummyHttpAgent;
    }
    return agent;
  }

  destroy(): void {
    this.sshAgent?.destroy();
    super.destroy();
  }
}

// Wraps DevtoolsProxyAgent with async CA resolution via systemCA()
class DevtoolsProxyAgentWithSystemCA extends AgentBase {
  readonly proxyOptions: DevtoolsProxyOptions;
  logger: ProxyLogEmitter = new EventEmitter();
  private agent: Promise<DevtoolsProxyAgent>;

  constructor(proxyOptions: DevtoolsProxyOptions) {
    super();
    this.proxyOptions = proxyOptions;
    this.agent = (async () => {
      const { ca } = await systemCA({ ca: proxyOptions.ca });
      return new DevtoolsProxyAgent(
        { ...proxyOptions, ca, allowPartialTrustChain: true },
        this.logger,
      );
    })();
    this.agent.catch(() => {
      /* handled later */
    });
  }

  async initialize(): Promise<void> {
    const agent = await this.agent;
    await agent.initialize?.();
  }

  override async connect(): Promise<DevtoolsProxyAgent> {
    return await this.agent;
  }

  async destroy(): Promise<void> {
    (await this.agent).destroy();
  }
}

export function createAgent(
  proxyOptions: DevtoolsProxyOptions,
): AgentWithInitialize {
  return new DevtoolsProxyAgentWithSystemCA(proxyOptions);
}

export function useOrCreateAgent(
  proxyOptions: DevtoolsProxyOptions | AgentWithInitialize,
  target?: string,
  useTargetRegardlessOfExistingAgent = false,
): AgentWithInitialize | undefined {
  if ('createConnection' in proxyOptions) {
    const agent = proxyOptions as AgentWithInitialize;
    if (
      useTargetRegardlessOfExistingAgent &&
      target !== undefined &&
      agent.proxyOptions &&
      !proxyForUrl(agent.proxyOptions, target)
    ) {
      return undefined;
    }
    return agent;
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
