import { ProxyAgent } from 'proxy-agent';
import type { Agent } from 'https';
import type { DevtoolsProxyOptions } from './proxy-options';
import { proxyForUrl } from './proxy-options';
import type { ClientRequest } from 'http';
import type { TcpNetConnectOpts } from 'net';
import type { ConnectionOptions } from 'tls';
import type { Duplex } from 'stream';
import { SSHAgent } from './ssh';

export type AgentWithInitialize = Agent & {
  // This is genuinely custom for our usage (to allow establishing an SSH tunnel
  // first before starting to push connections through it)
  initialize?(): Promise<void>;

  // This is just part of the regular Agent interface, used by Node.js itself,
  // but missing from @types/node
  createSocket(
    req: ClientRequest,
    options: TcpNetConnectOpts | ConnectionOptions,
    cb: (err: Error | null, s?: Duplex) => void
  ): void;
};

export function createAgent(
  proxyOptions: DevtoolsProxyOptions
): AgentWithInitialize {
  if (proxyOptions.proxy && new URL(proxyOptions.proxy).protocol === 'ssh:') {
    return new SSHAgent(proxyOptions);
  }
  const getProxyForUrl = proxyForUrl(proxyOptions);
  return new ProxyAgent({
    getProxyForUrl,
  });
}
