import type fetch from 'node-fetch';
import type { RequestInit, RequestInfo, Request, Response } from 'node-fetch';
import type { AgentWithInitialize } from './agent';
import { useOrCreateAgent } from './agent';
import type { DevtoolsProxyOptions } from './proxy-options';

declare const __webpack_require__: unknown;

// The original version of this code was largely taken from
// https://github.com/mongodb-js/mongosh/blob/8e6962432397154941f593c847d8f774bfd49f1c/packages/import-node-fetch/src/index.ts
async function importNodeFetch(): Promise<typeof fetch> {
  // Node-fetch is an ESM module from 3.x
  // Importing ESM modules to CommonJS is possible with a dynamic import.
  // However, once this is transpiled with TS, `await import()` changes to `require()`, which fails to load
  // the package at runtime.
  // The alternative, to transpile with "moduleResolution": "NodeNext", is not always feasible.
  // Use this function to safely import the node-fetch package
  let module: typeof fetch | { default: typeof fetch };
  try {
    module = await import('node-fetch');
  } catch (err: unknown) {
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      err.code === 'ERR_REQUIRE_ESM' &&
      typeof __webpack_require__ === 'undefined'
    ) {
      // This means that the import() above was transpiled to require()
      // and that that require() called failed because it saw actual on-disk ESM.
      // In this case, it should be safe to use eval'ed import().
      module = await eval(`import('node-fetch')`);
    } else {
      throw err;
    }
  }

  return typeof module === 'function' ? module : module.default;
}
let cachedFetch: Promise<typeof fetch> | undefined;

export type { Request, Response, RequestInfo, RequestInit };
export function createFetch(
  proxyOptions: DevtoolsProxyOptions | AgentWithInitialize,
): { agent: AgentWithInitialize | undefined } & ((
  url: string,
  fetchOptions?: RequestInit,
) => Promise<Response>) {
  const agent = useOrCreateAgent(proxyOptions);
  let agentInitializedPromise;

  return Object.assign(
    async (url: string, fetchOptions?: RequestInit) => {
      const [fetch] = await Promise.all([
        (cachedFetch ??= importNodeFetch()),
        (agentInitializedPromise ??= agent?.initialize?.()),
      ]);
      return await fetch(url, { agent, ...fetchOptions });
    },
    { agent },
  );
}
