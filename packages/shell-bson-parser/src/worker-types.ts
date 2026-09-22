import type { MarkedPayload } from './structured-clone-bson.js';

export type WorkerRequest = {
  id: number;
  args: MarkedPayload<unknown[]>;
};

export type WorkerResponse = { id: number } & (
  | { ok: true; result: MarkedPayload<unknown> }
  | { ok: false; error: string }
);
