import { parse } from './parse.js';
import { markBSON, unmarkBSON } from './structured-clone-bson.js';

import type { WorkerRequest, WorkerResponse } from './worker-types.js';

// Exported for tests
export const ALLOWED_GLOBALS = new Set([
  // Used by this file.
  'self',
  'onmessage',
  'postMessage',

  // Needed for parsing.
  'Object',
  'Array',
  'Function',
  'String',
  'Number',
  'Boolean',
  'Symbol',
  'BigInt',
  'Math',
  'Date',
  'RegExp',
  'JSON',
  'Map',
  'Set',
  'WeakMap',
  'WeakSet',
  'Promise',
  'Proxy',
  'Reflect',
  'Error',
  'TypeError',
  'RangeError',
  'SyntaxError',
  'ReferenceError',
  'EvalError',
  'URIError',
  'ArrayBuffer',
  'SharedArrayBuffer',
  'DataView',
  'Uint8Array',
  'Int8Array',
  'Uint8ClampedArray',
  'Uint16Array',
  'Int16Array',
  'Uint32Array',
  'Int32Array',
  'Float32Array',
  'Float64Array',
  'BigInt64Array',
  'BigUint64Array',
  'TextEncoder',
  'TextDecoder',
  'undefined',
  'NaN',
  'Infinity',
  'isNaN',
  'isFinite',
  'parseFloat',
  'parseInt',
  'encodeURIComponent',
  'decodeURIComponent',
  'Buffer',
]);

// Exported for tests
export function restrictGlobalScope(scope: object): void {
  for (const key of Object.getOwnPropertyNames(scope)) {
    if (ALLOWED_GLOBALS.has(key)) continue;
    try {
      delete (scope as any)[key];
    } catch {
      // Non-configurable in this environment
    }
  }
}

// Exported for tests
export const DISALLOWED_PROTOTYPE_PROPS = [
  '__proto__',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
  'constructor',
] as const;

// Exported for tests
export function restrictObjectPrototype(): void {
  for (const key of DISALLOWED_PROTOTYPE_PROPS) {
    try {
      delete (Object.prototype as any)[key];
    } catch {
      // Non-configurable in this environment
    }
  }
}

// Exported for tests
export function handleRequest(request: WorkerRequest): WorkerResponse {
  const { id, args } = request;
  try {
    const value = parse(...(unmarkBSON(args) as Parameters<typeof parse>));
    const result = markBSON(value);
    return { id, ok: true, result };
  } catch (err) {
    return { id, ok: false, error: (err as Error).message };
  }
}

if (typeof self !== 'undefined') {
  restrictObjectPrototype();
  restrictGlobalScope(self);
  self.onmessage = (event: MessageEvent<WorkerRequest>) => {
    (self as unknown as Worker).postMessage(handleRequest(event.data));
  };
}
