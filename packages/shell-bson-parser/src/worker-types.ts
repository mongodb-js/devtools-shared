export type WorkerRequest = {
  id: number;
  args: unknown[];
};

export type WorkerResponse = { id: number } & (
  | { ok: true; result: unknown }
  | { ok: false; error: string }
);
