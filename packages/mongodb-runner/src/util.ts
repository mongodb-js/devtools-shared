import { BSON } from 'mongodb';
import createDebug from 'debug';

export const debug = createDebug('mongodb-runner');
export const uuid = () => new BSON.UUID().toHexString(true);
export const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));
export const range = (n: number): number[] => [...Array(n).keys()];

/**
 * This function iterates `iterable` and applies `fn` to each item that
 * `iterable` produces.  `fn` is not awaited on each iteration of `iterable`.
 * After `iterable` has been consumed, all `fn`s are awaited together with `Promise.allSettled`
 * and the result of `Promise.allSettled` is returned.
 *
 * **Note** This means that any errors from `fn` are caught and returned, not thrown as a rejection.
 *
 * This function speeds up the application of `fn` for scenarios where `fn` might take time.
 */
export async function parallelForEach<T>(
  iterable: AsyncIterable<T>,
  fn: (arg0: T) => Promise<void> | void
): Promise<PromiseSettledResult<void>[]> {
  const result = [];
  for await (const item of iterable) {
    result.push(fn(item));
  }

  return await Promise.allSettled(result);
}
