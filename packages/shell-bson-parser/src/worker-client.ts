import path from 'path';
import { pathToFileURL } from 'url';
import { EJSON } from 'bson';

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
    if (response.ok) {
      entry.resolve(
        (
          EJSON.deserialize(response.result as Record<string, unknown>, {
            relaxed: false,
          }) as {
            value: unknown;
          }
        ).value,
      );
    } else {
      entry.reject(new Error(response.error));
    }
  };

  worker.onerror = (event: ErrorEvent) => {
    for (const [id, entry] of pending) {
      entry.reject(new Error(event.message));
      pending.delete(id);
    }
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

  const request: WorkerRequest = {
    id,
    method,
    args: EJSON.serialize({ args }, { relaxed: false }).args,
  };
  activeWorker.postMessage(request);

  scheduleIdleTermination();

  return promise;
}

export function terminateWorker(): void {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
  if (worker) {
    worker.terminate();
    worker = null;
  }
  for (const [id, entry] of pending) {
    entry.reject(new Error('Worker terminated'));
    pending.delete(id);
  }
}
