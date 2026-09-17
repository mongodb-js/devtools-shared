import { parse } from './parse.js';
import { toJSString } from './stringify.js';
import {
  serializeBsonValues,
  deserializeBsonValues,
} from './structured-clone-bson.js';

import type { WorkerRequest, WorkerResponse } from './worker-types.js';

const handlers = {
  parse,
  toJSString,
} as const;

// Exported for test
export function handleRequest(request: WorkerRequest): WorkerResponse {
  const { id, method, args } = request;
  try {
    const handler = handlers[method];
    if (!handler) {
      throw new Error(`Unknown method: ${method}`);
    }
    const deserializedArgs = deserializeBsonValues(args);
    const value = (handler as (...args: unknown[]) => unknown)(
      ...deserializedArgs,
    );
    const result = serializeBsonValues(value);
    return { id, ok: true, result };
  } catch (err) {
    return { id, ok: false, error: (err as Error).message };
  }
}

if (typeof self !== 'undefined') {
  self.onmessage = (event: MessageEvent<WorkerRequest>) => {
    (self as unknown as Worker).postMessage(handleRequest(event.data));
  };
}
