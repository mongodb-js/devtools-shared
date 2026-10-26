import type { TrackedPayload } from './structured-clone-bson.js';

export type WorkerRequest = {
  id: number;
  args: TrackedPayload<unknown[]>;
};

export type WorkerResponse = { id: number } & (
  | { ok: true; result: TrackedPayload<unknown> }
  | { ok: false; error: Error; errorProps: Record<string, unknown> }
);

export type WorkerCallbacks = {
  onMessage: (response: WorkerResponse) => void;
  onError: (err: Error) => void;
};

export type WorkerHandle = {
  postMessage: (message: unknown) => void;
  terminate: () => void;
};
