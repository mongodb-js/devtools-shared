import {
  serializeBsonValues,
  deserializeBsonValues,
} from './structured-clone-bson.js';
import type { WorkerMethod, WorkerResponse } from './worker-types.js';

/** Close the worker after being idle for 30sec */
const IDLE_TIMEOUT_MS = 30_000;

let worker: Worker | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
let blobUrl: string | null = null;
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

async function getWorkerBlobUrl(): Promise<string> {
  if (process.env.TEST_SKIP_WORKER_SCRIPT_FETCH) {
    return '';
  }
  const scriptUrl = new URL('./worker.js', import.meta.url);
  const response = await fetch(scriptUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch shell-bson-parser worker script: ${response.status} ${response.statusText}`,
    );
  }
  const code = await response.text();
  return globalThis.URL.createObjectURL(
    new Blob([code], { type: 'text/javascript' }),
  );
}

async function createWorker(): Promise<Worker> {
  if (worker) {
    return worker;
  }

  blobUrl = await getWorkerBlobUrl();

  worker = new Worker(blobUrl, { type: 'module' });

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

export async function callWorker<T>(
  method: WorkerMethod,
  args: unknown[],
): Promise<T> {
  const activeWorker = await createWorker();
  const id = nextId++;
  const promise = new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve, reject });
  });
  try {
    activeWorker.postMessage({
      id,
      method,
      args: serializeBsonValues(args),
    });
  } catch (err) {
    pending.get(id)?.reject(err as Error);
    pending.delete(id);
  } finally {
    scheduleIdleTermination();
  }
  return promise;
}

export function terminateWorker(
  reason: Error = new Error('Worker terminated'),
): void {
  if (idleTimer) clearTimeout(idleTimer);
  if (worker) worker.terminate();
  if (blobUrl) globalThis.URL.revokeObjectURL(blobUrl);

  idleTimer = null;
  worker = null;
  blobUrl = null;

  for (const [id, entry] of pending) {
    entry.reject(reason);
    pending.delete(id);
  }
}
