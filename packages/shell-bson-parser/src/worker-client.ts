import path from 'path';
import { pathToFileURL } from 'url';

import {
  serializeBsonValues,
  deserializeBsonValues,
} from './structured-clone-bson';

export type WorkerMethod = 'parse' | 'toJSString' | 'validate';

export type WorkerRequest = {
  id: number;
  method: WorkerMethod;
  args: unknown[];
};

export type WorkerResponse = { id: number } & (
  | { ok: true; result: unknown }
  | { ok: false; error: string }
);

const IDLE_TIMEOUT_MS = 30_000;

let worker: Worker | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
let nextId = 0;
const pending = new Map<
  number,
  { resolve: (v: any) => void; reject: (e: Error) => void }
>();

function scheduleIdleTermination() {
  if (idleTimer) {
    clearTimeout(idleTimer);
  }
  idleTimer = setTimeout(() => {
    // Only safe to terminate when nothing is in flight.
    if (pending.size === 0) {
      terminateWorker();
    } else {
      scheduleIdleTermination();
    }
  }, IDLE_TIMEOUT_MS);
}

function getWorker(): Worker {
  if (worker) {
    return worker;
  }

  worker = new Worker(pathToFileURL(path.join(__dirname, 'worker.js')));

  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const response = event.data;
    const entry = pending.get(response.id);
    if (!entry) {
      return;
    }
    pending.delete(response.id);
    if (!response.ok) {
      entry.reject(new Error(response.error));
      return;
    }
    try {
      entry.resolve(deserializeBsonValues(response.result));
    } catch (err) {
      entry.reject(err as Error);
    }
  };

  worker.onerror = (event: ErrorEvent) => {
    terminateWorker(new Error(event.message || 'Worker error'));
  };
  worker.onmessageerror = () => {
    terminateWorker(new Error('Worker message could not be deserialized'));
  };

  return worker;
}

export function callWorker<T>(
  method: WorkerMethod,
  args: unknown[],
): Promise<T> {
  const activeWorker = getWorker();
  const id = nextId++;

  const promise = new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve, reject });
  });

  try {
    const request: WorkerRequest = {
      id,
      method,
      args: serializeBsonValues(args),
    };
    activeWorker.postMessage(request);
  } catch (err) {
    pending.get(id)?.reject(err as Error);
    pending.delete(id);
    return promise;
  }

  scheduleIdleTermination();

  return promise;
}

export function terminateWorker(
  reason: Error = new Error('Worker terminated'),
): void {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
  if (worker) {
    worker.terminate();
    worker = null;
  }
  for (const [id, entry] of pending) {
    entry.reject(reason);
    pending.delete(id);
  }
}
