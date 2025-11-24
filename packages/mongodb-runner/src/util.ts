import type { MongoClientOptions } from 'mongodb';
import { BSON } from 'mongodb';
import createDebug from 'debug';
import { ConnectionString } from 'mongodb-connection-string-url';

export const debug = createDebug('mongodb-runner');
export const debugVerbose = debug.extend('verbose');
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
  fn: (arg0: T) => Promise<void> | void,
): Promise<PromiseSettledResult<void>[]> {
  const result = [];
  for await (const item of iterable) {
    result.push(fn(item));
  }

  return await Promise.allSettled(result);
}

export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> {
  const ret: Partial<Pick<T, K>> = {};
  for (const key of Object.keys(obj) as K[]) {
    if (keys.includes(key)) {
      ret[key] = obj[key];
    }
  }
  return ret as Pick<T, K>;
}

export function jsonClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function makeConnectionString(
  hostport: string,
  replSetName?: string,
  defaultConnectionOptions: Partial<MongoClientOptions> = {},
): string {
  const cs = new ConnectionString(`mongodb://${hostport}/`);
  if (replSetName) {
    cs.typedSearchParams<MongoClientOptions>().set('replicaSet', replSetName);
  }
  if (defaultConnectionOptions.tls) {
    cs.typedSearchParams<MongoClientOptions>().set('tls', 'true');
  }
  if (defaultConnectionOptions.tlsCAFile) {
    cs.typedSearchParams<MongoClientOptions>().set(
      'tlsCAFile',
      defaultConnectionOptions.tlsCAFile,
    );
  }
  if (defaultConnectionOptions.tlsCertificateKeyFile) {
    cs.typedSearchParams<MongoClientOptions>().set(
      'tlsCertificateKeyFile',
      defaultConnectionOptions.tlsCertificateKeyFile,
    );
  }
  if (defaultConnectionOptions.tlsCertificateKeyFilePassword) {
    cs.typedSearchParams<MongoClientOptions>().set(
      'tlsCertificateKeyFilePassword',
      defaultConnectionOptions.tlsCertificateKeyFilePassword,
    );
  }
  if (defaultConnectionOptions.tlsAllowInvalidCertificates) {
    cs.typedSearchParams<MongoClientOptions>().set(
      'tlsAllowInvalidCertificates',
      'true',
    );
  }
  if (defaultConnectionOptions.auth?.username) {
    cs.username = defaultConnectionOptions.auth.username;
  }
  if (defaultConnectionOptions.auth?.password) {
    cs.password = defaultConnectionOptions.auth.password;
  }
  return cs.toString();
}
