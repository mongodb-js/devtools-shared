import { BSON } from 'mongodb';
import createDebug from 'debug';

export const debug = createDebug('mongodb-runner');
export const uuid = () => new BSON.UUID().toHexString(true);
export const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));
export const range = (n: number): number[] => [...Array(n).keys()];
export async function parallelForEach<T>(
  iterable: AsyncIterable<T>,
  fn: (arg0: T) => Promise<void> | void
) {
  const items = iterable[Symbol.asyncIterator]();

  const result = [];
  for (let item = await items.next(); !item.done; item = await items.next()) {
    result.push(fn(item.value));
  }

  return await Promise.allSettled(result);
}
