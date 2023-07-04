import { BSON } from 'mongodb';
import createDebug from 'debug';

export const debug = createDebug('mongodb-runner');
export const uuid = () => new BSON.UUID().toHexString(true);
export const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));
export const range = (n: number): number[] => [...Array(n).keys()];
