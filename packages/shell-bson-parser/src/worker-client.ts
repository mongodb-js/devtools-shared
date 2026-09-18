import * as WebWorkerModule from 'web-worker';
const WebWorker = (WebWorkerModule as unknown as { default: typeof Worker })
  .default;
import { markBSON, unmarkBSON } from './structured-clone-bson.js';
import type { WorkerResponse } from './worker-types.js';

/** Close the worker after being idle for 30sec */
const IDLE_TIMEOUT_MS = 30_000;
/** Default execution timeout for worker requests */
const DEFAULT_EXECUTION_TIMEOUT_MS = 120_000;

function getExecutionTimeoutMs(): number {
  return process.env.TEST_EXECUTION_TIMEOUT_MS
    ? Number(process.env.TEST_EXECUTION_TIMEOUT_MS)
    : DEFAULT_EXECUTION_TIMEOUT_MS;
}

let worker: Worker | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
let blobUrl: string | null = null;
let nextId = 0;
const pending = new Map<
  number,
  {
    resolve: (v: any) => void;
    reject: (e: Error) => void;
    executionTimer: ReturnType<typeof setTimeout>;
  }
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

const isNodeEnv =
  typeof window === 'undefined' &&
  typeof process !== 'undefined' &&
  !!process.versions?.node;

async function getWorkerScriptUrl(): Promise<string> {
  if (isNodeEnv) {
    return new URL(
      process.env.TEST_WORKER_SCRIPT_URL ?? './worker.js',
      import.meta.url,
    ).toString();
  }

  // On browser env we want to fetch and blob so that the worker
  // script can run on atlas-cloud running locally.
  const scriptUrl = new URL('./worker.js', import.meta.url);
  const response = await fetch(scriptUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch shell-bson-parser worker script: ${response.status} ${response.statusText}`,
    );
  }
  const code = await response.text();
  blobUrl = globalThis.URL.createObjectURL(
    new Blob([code], { type: 'text/javascript' }),
  );
  return blobUrl;
}

async function createWorker(): Promise<Worker> {
  if (worker) {
    return worker;
  }

  const scriptUrl = await getWorkerScriptUrl();
  worker = new WebWorker(scriptUrl);
  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const response = event.data;
    const entry = pending.get(response.id);
    if (!entry) {
      return;
    }
    clearTimeout(entry.executionTimer);
    pending.delete(response.id);
    if (!response.ok) {
      entry.reject(new Error(response.error));
      return;
    }
    try {
      entry.resolve(unmarkBSON(response.result));
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

export async function callWorker<T>(args: unknown[]): Promise<T> {
  const activeWorker = await createWorker();
  const id = nextId++;
  const executionTimeoutMs = getExecutionTimeoutMs();
  const promise = new Promise<T>((resolve, reject) => {
    const executionTimer = setTimeout(() => {
      // Terminate the worker is this message is taking too long to execute,
      // this means all the other pending requests will also be terminated.
      terminateWorker(
        new Error(`Worker execution timed out after ${executionTimeoutMs}ms`),
      );
    }, executionTimeoutMs);
    pending.set(id, { resolve, reject, executionTimer });
  });
  try {
    activeWorker.postMessage({
      id,
      args: markBSON(args),
    });
  } catch (err) {
    const entry = pending.get(id);
    if (entry) clearTimeout(entry.executionTimer);
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
    clearTimeout(entry.executionTimer);
    entry.reject(reason);
    pending.delete(id);
  }
}
