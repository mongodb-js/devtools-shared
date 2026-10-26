import { createBrowserWorker } from './browser-worker.js';
import { createNodeWorker } from './node-worker.js';
import { trackBSON, untrackBSON } from './structured-clone-bson.js';
import type {
  WorkerHandle,
  WorkerCallbacks,
  WorkerResponse,
} from './worker-types.js';

/** Default execution timeout for worker requests */
const DEFAULT_EXECUTION_TIMEOUT_MS = 5_000;

export type ExecutionOptions = {
  /** Defaults to `5_000` (5 seconds). */
  executionTimeoutMs?: number;
};

/** Exported for tests */
export function getExecutionTimeoutMs(executionTimeoutMs?: number): number {
  if (!executionTimeoutMs || executionTimeoutMs <= 0) {
    return DEFAULT_EXECUTION_TIMEOUT_MS;
  }
  return executionTimeoutMs;
}

let worker: WorkerHandle | null = null;
let workerSourceOverride: string | null = null;
let workerPromise: Promise<WorkerHandle> | null = null;
let nextId = 0;
const pending = new Map<
  number,
  {
    resolve: (v: any) => void;
    reject: (e: Error) => void;
    executionTimer: ReturnType<typeof setTimeout>;
  }
>();

/** Exported for tests */
export function setWorkerSource(source: string | null): void {
  workerSourceOverride = source;
}

async function getWorkerSource(): Promise<string> {
  if (workerSourceOverride !== null) {
    return workerSourceOverride;
  }
  const source = await import('./worker-source.js');
  return source.default;
}

function createWorker(): Promise<WorkerHandle> {
  if (worker) {
    return Promise.resolve(worker);
  }
  if (workerPromise) {
    return workerPromise;
  }
  const onMessage = (response: WorkerResponse) => {
    const entry = pending.get(response.id);
    if (!entry) {
      return;
    }
    clearTimeout(entry.executionTimer);
    pending.delete(response.id);
    if (!response.ok) {
      const { error, errorProps } = response;
      entry.reject(
        typeof error === 'object' && error !== null
          ? Object.assign(error, errorProps)
          : error,
      );
      return;
    }
    try {
      entry.resolve(untrackBSON(response.result));
    } catch (err) {
      entry.reject(err as Error);
    }
  };

  const startup = (async () => {
    const source = await getWorkerSource();
    if (!source) {
      throw new Error(
        '@mongodb-js/shell-bson-parser worker source is missing from the build',
      );
    }
    // Late errors/exits from an already terminated worker must not kill its
    // replacement, so only react when this handle is still the active one.
    let newWorker: WorkerHandle | null = null;
    const handlers: WorkerCallbacks = {
      onMessage,
      onError: (err) => {
        if (newWorker && newWorker === worker) terminateWorker(err);
      },
    };
    newWorker =
      typeof globalThis.Worker === 'function'
        ? createBrowserWorker(source, handlers)
        : createNodeWorker(source, handlers);

    worker = newWorker;
    return newWorker;
  })();
  startup.catch(() => {
    if (workerPromise === startup) workerPromise = null;
  });
  workerPromise = startup;

  return startup;
}

export async function callWorker<T>(
  args: unknown[],
  executionOptions?: ExecutionOptions,
): Promise<T> {
  const activeWorker = await createWorker();
  const id = nextId++;
  const executionTimeoutMs = getExecutionTimeoutMs(
    executionOptions?.executionTimeoutMs,
  );
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
    if (entry) {
      clearTimeout(entry.executionTimer);
      pending.delete(id);
      entry.reject(err as Error);
    }
  }
  return promise;
}

export function terminateWorker(
  reason: Error = new Error('Worker terminated'),
): void {
  if (worker) worker.terminate();

  worker = null;
  workerPromise = null;

  for (const [id, entry] of pending) {
    clearTimeout(entry.executionTimer);
    entry.reject(reason);
    pending.delete(id);
  }
}
