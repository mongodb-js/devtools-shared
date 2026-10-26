import type { WorkerHandle, WorkerCallbacks } from './worker-types.js';

export function createBrowserWorker(
  source: string,
  { onMessage, onError }: WorkerCallbacks,
): WorkerHandle {
  // Compass Web injects whatwg-url for bare URL references; it lacks blob APIs.
  // Use the native constructor for blob creation and revocation.
  const blobUrl = globalThis.URL.createObjectURL(
    new Blob([source], { type: 'text/javascript' }),
  );
  try {
    const worker = new globalThis.Worker(blobUrl);
    worker.addEventListener('message', (event: MessageEvent) =>
      onMessage(event.data),
    );
    worker.addEventListener('error', (event: ErrorEvent) =>
      onError(new Error(event.message || 'Worker error')),
    );
    worker.addEventListener('messageerror', () =>
      onError(new Error('Worker message could not be deserialized')),
    );

    return {
      postMessage: (message) => worker.postMessage(message),
      terminate: () => {
        worker.terminate();
        globalThis.URL.revokeObjectURL(blobUrl);
      },
    };
  } catch (err) {
    globalThis.URL.revokeObjectURL(blobUrl);
    throw err;
  }
}
