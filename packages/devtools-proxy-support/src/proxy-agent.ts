// Copyright (c) 2013 Nathan Rajlich <nathan@tootallnate.net>
//
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// 'Software'), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
// IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
// CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
// TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// This file is closely adapted from
// https://github.com/TooTallNate/proxy-agents/blob/5555794b6d9e4b0a36fac80a2d3acea876a8f7dc/packages/proxy-agent/src/index.ts
// (hence the license notice above), with core differences being that
// this module uses a different `getProxyForUrl` signature for more flexibility
// and loads the individual agents it defers to lazily.
// Relevant pull requests have been linked in-line.

import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import { LRUCache } from 'lru-cache';
import type { AgentConnectOpts } from 'agent-base';
import { Agent } from 'agent-base';
import createDebug from 'debug';
import type { PacProxyAgentOptions } from 'pac-proxy-agent';
import type { PacProxyAgent } from 'pac-proxy-agent';
import type { HttpProxyAgentOptions } from 'http-proxy-agent';
import type { HttpProxyAgent } from 'http-proxy-agent';
import type { HttpsProxyAgentOptions } from 'https-proxy-agent';
import type { HttpsProxyAgent } from 'https-proxy-agent';
import type { SocksProxyAgentOptions } from 'socks-proxy-agent';
import type { SocksProxyAgent } from 'socks-proxy-agent';
import { createRequire } from 'module';

const debug = createDebug('proxy-agent');

type ValidProtocol =
  | typeof HttpProxyAgent.protocols[number]
  | typeof HttpsProxyAgent.protocols[number]
  | typeof SocksProxyAgent.protocols[number]
  | typeof PacProxyAgent.protocols[number];

type AgentConstructor = new (
  proxy: string,
  proxyAgentOptions?: ProxyAgentOptions
) => Agent;

type GetProxyForUrlCallback = (
  url: string,
  req: http.ClientRequest
) => string | Promise<string>;

/**
 * Shorthands for built-in supported types.
 */
// https://github.com/TooTallNate/proxy-agents/pull/327
const wellKnownAgents = {
  http: async () => (await import('http-proxy-agent')).HttpProxyAgent,
  https: async () => (await import('https-proxy-agent')).HttpsProxyAgent,
  socks: async () => (await import('socks-proxy-agent')).SocksProxyAgent,
  pac: async () => (await import('pac-proxy-agent')).PacProxyAgent,
} as const;

/**
 * Supported proxy types.
 */
export const proxies: {
  [P in ValidProtocol]: [
    () => Promise<AgentConstructor>,
    () => Promise<AgentConstructor>
  ];
} = {
  http: [wellKnownAgents.http, wellKnownAgents.https],
  https: [wellKnownAgents.http, wellKnownAgents.https],
  socks: [wellKnownAgents.socks, wellKnownAgents.socks],
  socks4: [wellKnownAgents.socks, wellKnownAgents.socks],
  socks4a: [wellKnownAgents.socks, wellKnownAgents.socks],
  socks5: [wellKnownAgents.socks, wellKnownAgents.socks],
  socks5h: [wellKnownAgents.socks, wellKnownAgents.socks],
  'pac+data': [wellKnownAgents.pac, wellKnownAgents.pac],
  'pac+file': [wellKnownAgents.pac, wellKnownAgents.pac],
  'pac+ftp': [wellKnownAgents.pac, wellKnownAgents.pac],
  'pac+http': [wellKnownAgents.pac, wellKnownAgents.pac],
  'pac+https': [wellKnownAgents.pac, wellKnownAgents.pac],
};

function isValidProtocol(v: string): v is ValidProtocol {
  return Object.keys(proxies).includes(v);
}

export type ProxyAgentOptions = HttpProxyAgentOptions<''> &
  HttpsProxyAgentOptions<''> &
  SocksProxyAgentOptions &
  PacProxyAgentOptions<''> & {
    /**
     * Default `http.Agent` instance to use when no proxy is
     * configured for a request. Defaults to a new `http.Agent()`
     * instance with the proxy agent options passed in.
     */
    httpAgent?: http.Agent;
    /**
     * Default `http.Agent` instance to use when no proxy is
     * configured for a request. Defaults to a new `https.Agent()`
     * instance with the proxy agent options passed in.
     */
    httpsAgent?: http.Agent;
    /**
     * A callback for dynamic provision of proxy for url.
     * Defaults to standard proxy environment variables,
     * see https://www.npmjs.com/package/proxy-from-env for details
     */
    // https://github.com/TooTallNate/proxy-agents/pull/326
    getProxyForUrl: GetProxyForUrlCallback;
  };

/**
 * Uses the appropriate `Agent` subclass based off of the "proxy"
 * environment variables that are currently set.
 *
 * An LRU cache is used, to prevent unnecessary creation of proxy
 * `http.Agent` instances.
 */
export class ProxyAgent extends Agent {
  /**
   * Cache for `Agent` instances.
   */
  // https://github.com/TooTallNate/proxy-agents/pull/325
  cache = new LRUCache<string, Agent>({
    max: 20,
    dispose: (agent) => agent.destroy(),
  });

  connectOpts?: ProxyAgentOptions;
  httpAgent: http.Agent;
  httpsAgent: http.Agent;
  getProxyForUrl: GetProxyForUrlCallback;

  constructor(opts: ProxyAgentOptions) {
    super(opts);
    debug('Creating new ProxyAgent instance: %o', opts);
    this.connectOpts = opts;
    this.httpAgent = opts?.httpAgent || new http.Agent(opts);
    this.httpsAgent =
      opts?.httpsAgent || new https.Agent(opts as https.AgentOptions);
    this.getProxyForUrl = opts.getProxyForUrl;
  }

  async connect(
    req: http.ClientRequest,
    opts: AgentConnectOpts
  ): Promise<http.Agent> {
    const { secureEndpoint } = opts;
    const isWebSocket = req.getHeader('upgrade') === 'websocket';
    const protocol = secureEndpoint
      ? isWebSocket
        ? 'wss:'
        : 'https:'
      : isWebSocket
      ? 'ws:'
      : 'http:';
    const host = req.getHeader('host');
    const url = new URL(req.path, `${protocol}//${String(host)}`).href;
    const proxy = await this.getProxyForUrl(url, req);

    if (!proxy) {
      debug('Proxy not enabled for URL: %o', url);
      return secureEndpoint ? this.httpsAgent : this.httpAgent;
    }

    debug('Request URL: %o', url);
    debug('Proxy URL: %o', proxy);

    if (proxy.startsWith('pac+')) {
      installPacHttpsHack();
    }

    // attempt to get a cached `http.Agent` instance first
    const cacheKey = `${protocol}+${proxy}`;
    let agent = this.cache.get(cacheKey);
    if (!agent) {
      const proxyUrl = new URL(proxy);
      const proxyProto = proxyUrl.protocol.replace(':', '');
      if (!isValidProtocol(proxyProto)) {
        throw new Error(`Unsupported protocol for proxy URL: ${proxy}`);
      }
      const ctor = await proxies[proxyProto][
        secureEndpoint || isWebSocket ? 1 : 0
      ]();
      agent = new ctor(proxy, this.connectOpts);
      this.cache.set(cacheKey, agent);
    } else {
      debug('Cache hit for proxy URL: %o', proxy);
    }

    return agent;
  }

  destroy(): void {
    for (const agent of this.cache.values()) {
      agent.destroy();
    }
    super.destroy();
  }
}

declare const __webpack_require__: unknown;

// Work around https://github.com/TooTallNate/proxy-agents/pull/329
// While the proxy-agent package implementation in this file,
// and in the original, properly check whether an 'upgrade' header
// is present and set to 'websocket', the pac-proxy-agent performs
// a similar 'CONNECT vs regular HTTP proxy' selection and doesn't
// account for this. We monkey-patch in this behavior ourselves.
function installPacHttpsHack() {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  let HttpProxyAgent: typeof import('http-proxy-agent').HttpProxyAgent;
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  let HttpsProxyAgent: typeof import('https-proxy-agent').HttpsProxyAgent;
  if (typeof __webpack_require__ === 'undefined') {
    const pacProxyAgentPath = require.resolve('pac-proxy-agent');
    const pacRequire = createRequire(pacProxyAgentPath);
    HttpProxyAgent = pacRequire('http-proxy-agent').HttpProxyAgent;
    HttpsProxyAgent = pacRequire('https-proxy-agent').HttpsProxyAgent;
  } else {
    // No such thing as require.resolve() in webpack, just need to assume
    // that everything is hoisted :(
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    HttpProxyAgent = require('http-proxy-agent').HttpProxyAgent;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    HttpsProxyAgent = require('https-proxy-agent').HttpsProxyAgent;
  }

  const kCompanionHttpsProxyAgent = Symbol('kCompanionHttpsProxyAgent');
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const originalConnect = HttpProxyAgent.prototype.connect;
  HttpProxyAgent.prototype.connect = function (req, ...args) {
    if (req.getHeader('upgrade') === 'websocket') {
      let companionHttpsAgent: HttpsProxyAgent<string> = (this as any)[
        kCompanionHttpsProxyAgent
      ];
      if (!companionHttpsAgent) {
        companionHttpsAgent = new HttpsProxyAgent(
          this.proxy.href,
          this.options
        );
        (this as any)[kCompanionHttpsProxyAgent] = companionHttpsAgent;
      }
      return companionHttpsAgent.connect(req, ...args);
    }
    return originalConnect.call(this, req, ...args);
  };
}
