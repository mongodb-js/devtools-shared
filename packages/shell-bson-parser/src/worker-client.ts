import * as WebWorkerModule from 'web-worker';
const WebWorker = (WebWorkerModule as unknown as { default: typeof Worker })
  .default;
import { trackBSON, untrackBSON } from './structured-clone-bson.js';
import type { WorkerResponse } from './worker-types.js';

/** Default execution timeout for worker requests */
const DEFAULT_EXECUTION_TIMEOUT_MS = 120_000;

export type ExecutionOptions = {
  /** Defaults to `120_000` (2 minutes). */
  executionTimeoutMs?: number;
};

let worker: Worker | null = null;
let workerPromise: Promise<Worker> | null = null;
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

const isNodeEnv =
  typeof window === 'undefined' &&
  typeof process !== 'undefined' &&
  !!process.versions?.node;

async function getWorkerScriptUrl(): Promise<string> {
  const testWorkerScriptUrl =
    typeof process !== 'undefined'
      ? process.env?.TEST_WORKER_SCRIPT_URL
      : undefined;
  if (testWorkerScriptUrl) {
    return new URL(
      testWorkerScriptUrl,
      import.meta.url,
    ).toString();
  }
  if (isNodeEnv) {
    return new URL('./worker.mjs', import.meta.url).toString();
  }

  // On browser env we want to fetch and blob so that the worker
  // script can run on the web running locally.
  const scriptUrl = new URL('./worker.js', import.meta.url);
  const response = await fetch(scriptUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch shell-bson-parser worker script: ${response.status} ${response.statusText}`,
    );
  }
  const code = await response.text();
  blobUrl = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
  return blobUrl;
}

function createWorker(): Promise<Worker> {
  if (worker) {
    return Promise.resolve(worker);
  }
  if (workerPromise) {
    return workerPromise;
  }

  workerPromise = (async () => {
    const scriptUrl = await getWorkerScriptUrl();
    const newWorker = new WebWorker(scriptUrl, { type: 'module' });
    const onMessageHandler = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      const entry = pending.get(response.id);
      if (!entry) {
        return;
      }
      clearTimeout(entry.executionTimer);
      pending.delete(response.id);
      if (!response.ok) {
        entry.reject(response.error);
        return;
      }
      try {
        entry.resolve(untrackBSON(response.result));
      } catch (err) {
        entry.reject(err as Error);
      }
    };

    const onErrorHandler = (event: ErrorEvent) => {
      terminateWorker(new Error(event.message || 'Worker error'));
    };

    const onMessageErrorHandler = () => {
      terminateWorker(new Error('Worker message could not be deserialized'));
    };

    newWorker.addEventListener('message', onMessageHandler);
    newWorker.addEventListener('error', onErrorHandler);
    newWorker.addEventListener('messageerror', onMessageErrorHandler);

    worker = newWorker;
    return newWorker;
  })();

  workerPromise.catch(() => {
    workerPromise = null;
  });

  return workerPromise;
}

export async function callWorker<T>(
  args: unknown[],
  executionOptions?: ExecutionOptions,
): Promise<T> {
  const activeWorker = await createWorker();
  const id = nextId++;
  const executionTimeoutMs =
    executionOptions?.executionTimeoutMs ?? DEFAULT_EXECUTION_TIMEOUT_MS;
  const promise = new Promise<T>((resolve, reject) => {
    const executionTimer = setTimeout(() => {
      // Terminate the worker if this message is taking too long to execute,
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
      args: trackBSON(args),
    });
  } catch (err) {
    const entry = pending.get(id);
    if (entry) clearTimeout(entry.executionTimer);
    pending.get(id)?.reject(err as Error);
    pending.delete(id);
  }
  return promise;
}

export function terminateWorker(
  reason: Error = new Error('Worker terminated'),
): void {
  if (worker) worker.terminate();
  if (blobUrl) URL.revokeObjectURL(blobUrl);

  worker = null;
  workerPromise = null;
  blobUrl = null;

  for (const [id, entry] of pending) {
    clearTimeout(entry.executionTimer);
    entry.reject(reason);
    pending.delete(id);
  }
}
