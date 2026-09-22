import type { SerializedPayload } from './structured-clone-bson.js';

export type WorkerRequest = {
  id: number;
  args: SerializedPayload<unknown[]>;
};

export type WorkerResponse = { id: number } & (
  | { ok: true; result: SerializedPayload<unknown> }
  | { ok: false; error: string }
);
