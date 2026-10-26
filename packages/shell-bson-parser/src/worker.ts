import { parse } from './parse.js';
import { trackBSON, untrackBSON } from './structured-clone-bson.js';

import type { WorkerRequest, WorkerResponse } from './worker-types.js';

const { self, postMessage } = globalThis;

// Exported for tests
export const ALLOWED_GLOBALS = new Set([
  // Built-ins that acorn, bson and the evaluator reach for while parsing.
  'Object',
  'Array',
  'String',
  'Number',
  'Boolean',
  'Symbol',
  'Math',
  'Date',
  'RegExp',
  'JSON',
  'Map',
  'Set',
  'Error',
  'SyntaxError', // thrown by acorn on invalid input
  'ArrayBuffer', // bson's byte utils
  'Uint8Array',
  'isNaN', // bson
  'parseFloat', // acorn
  'parseInt', // bson

  // bson's byte utils pick a node or browser implementation at load time.
  'Buffer', // node
  'atob', // browser

  // bson randomBytes, used by ObjectId() and UUID() without arguments.
  'crypto',
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
    const value = parse(...(untrackBSON(args) as Parameters<typeof parse>));
    const result = trackBSON(value);
    return { id, ok: true, result };
  } catch (err) {
    const errorProps =
      typeof err === 'object' && err !== null ? { ...err } : {};
    return { id, ok: false, error: err as Error, errorProps };
  }
}

if (typeof self !== 'undefined') {
  const sendResponse = postMessage.bind(self);
  self.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
    sendResponse(handleRequest(event.data));
  });
  restrictObjectPrototype();
  restrictGlobalScope(globalThis);
}
