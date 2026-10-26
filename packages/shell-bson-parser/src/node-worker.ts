import type { Worker as NodeWorker } from 'worker_threads';
import type { WorkerHandle, WorkerCallbacks } from './worker-types.js';

export function createNodeWorker(
  source: string,
  { onMessage, onError }: WorkerCallbacks,
): WorkerHandle {
  // getBuiltinModule keeps bundlers from rewriting or polyfilling the import.
  const threads =
    typeof process !== 'undefined' && process.getBuiltinModule
      ? process.getBuiltinModule('worker_threads')
      : undefined;
  if (!threads) {
    throw new Error(
      '@mongodb-js/shell-bson-parser needs a global Worker or process.getBuiltinModule',
    );
  }

  // The worker bundle talks to worker_threads' parentPort itself.
  const worker: NodeWorker = new threads.Worker(source, { eval: true });
  // Fails pending requests right away if the thread dies, instead of waiting
  // for their timeout. Also fires after terminate(), ignored by the client.
  worker.on('exit', (code: number) =>
    onError(new Error(`Worker exited with code ${code}`)),
  );
  worker.on('message', onMessage);
  worker.on('error', (err: Error) =>
    onError(new Error(err?.message || 'Worker error')),
  );
  worker.on('messageerror', () =>
    onError(new Error('Worker message could not be deserialized')),
  );
  // An idle worker should not keep the host process alive. Must come after
  // the listeners, since adding a 'message' listener re-refs the port.
  worker.unref();

  return {
    postMessage: (message) => worker.postMessage(message),
    terminate: () => void worker.terminate(),
  };
}
