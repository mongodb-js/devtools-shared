import type { RequestInit, Response } from 'node-fetch';
import fetch from 'node-fetch';
import { createAgent } from './agent';
import type { DevtoolsProxyOptions } from './proxy-options';

export function createFetch(
  proxyOptions: DevtoolsProxyOptions
): (url: string, fetchOptions?: RequestInit) => Promise<Response> {
  const agent = createAgent(proxyOptions);
  return async (url, fetchOptions) => {
    return await fetch(url, { agent, ...fetchOptions });
  };
}
