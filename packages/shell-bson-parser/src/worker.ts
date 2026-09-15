import { EJSON } from 'bson';

import { parse } from './parse';
import { toJSString } from './stringify';
import { validate } from './validators';
import type { WorkerRequest, WorkerResponse } from './worker-client';

const handlers = {
  parse,
  toJSString,
  validate,
} as const;

// Exported for test
export function handleRequest(request: WorkerRequest): WorkerResponse {
  const { id, method, args } = request;
  try {
    const handler = handlers[method];
    if (!handler) {
      throw new Error(`Unknown method: ${method}`);
    }
    const deserializedArgs = EJSON.deserialize({ args }, { relaxed: false })
      .args as unknown[];
    const value = (handler as (...args: unknown[]) => unknown)(
      ...deserializedArgs,
    );
    // Structured clone (used by postMessage) doesn't preserve BSON class
    // instances (Long, Decimal128, ObjectId, MinKey, ...), so round-trip
    // through EJSON to keep them intact on the other side.
    const result = EJSON.serialize({ value }, { relaxed: false });
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
