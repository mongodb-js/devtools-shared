export type WorkerMethod = 'parse' | 'toJSString';

export type WorkerRequest = {
  id: number;
  method: WorkerMethod;
  args: unknown[];
};

export type WorkerResponse = { id: number } & (
  | { ok: true; result: unknown }
  | { ok: false; error: string }
);
