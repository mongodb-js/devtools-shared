import { parse } from './parse.js';
import {
  serializeBsonValues,
  deserializeBsonValues,
} from './structured-clone-bson.js';

import type { WorkerRequest, WorkerResponse } from './worker-types.js';

// Exported for test
export function handleRequest(request: WorkerRequest): WorkerResponse {
  const { id, args } = request;
  try {
    const value = parse(
      ...(deserializeBsonValues(args) as Parameters<typeof parse>),
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
