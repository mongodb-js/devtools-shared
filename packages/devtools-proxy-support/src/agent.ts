import { ProxyAgent } from 'proxy-agent';
import type { Agent } from 'https';
import type { DevtoolsProxyOptions } from './proxy-options';
import { proxyForUrl } from './proxy-options';
import type { ClientRequest } from 'http';
import type { TcpNetConnectOpts } from 'net';
import type { ConnectionOptions } from 'tls';
import type { Duplex } from 'stream';
import { SSHAgent } from './ssh';
import type { ProxyLogEmitter } from './logging';
import type { EventEmitter } from 'events';

// Helper type that represents an https.Agent (= connection factory)
// with some custom properties that TS does not know about and/or
// that we add for our own purposes.
export type AgentWithInitialize = Agent & {
  // This is genuinely custom for our usage (to allow establishing an SSH tunnel
  // first before starting to push connections through it)
  initialize?(): Promise<void>;
  logger?: ProxyLogEmitter;

  // This is just part of the regular Agent interface, used by Node.js itself,
  // but missing from @types/node
  createSocket(
    req: ClientRequest,
    options: TcpNetConnectOpts | ConnectionOptions,
    cb: (err: Error | null, s?: Duplex) => void
  ): void;

  // http.Agent is an EventEmitter, just missing from @types/node
} & Partial<EventEmitter>;

export function createAgent(
  proxyOptions: DevtoolsProxyOptions
): AgentWithInitialize {
  // This could be made a bit more flexible by creating an Agent using AgentBase
  // that will dynamically choose between SSHAgent and ProxyAgent.
  // Right now, this is a bit simpler in terms of lifetime management for SSHAgent.
  if (proxyOptions.proxy && new URL(proxyOptions.proxy).protocol === 'ssh:') {
    return new SSHAgent(proxyOptions);
  }
  const getProxyForUrl = proxyForUrl(proxyOptions);
  return new ProxyAgent({
    getProxyForUrl,
    ...proxyOptions,
  });
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
      !proxyForUrl(proxyOptions as DevtoolsProxyOptions)(target)
    )
      return undefined;
    return createAgent(proxyOptions as DevtoolsProxyOptions);
  }
}
