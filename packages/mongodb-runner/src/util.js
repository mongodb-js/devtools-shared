import { BSON } from 'mongodb';
import createDebug from 'debug';
import { ConnectionString } from 'mongodb-connection-string-url';
export const debug = createDebug('mongodb-runner');
export const debugVerbose = debug.extend('verbose');
export const uuid = () => new BSON.UUID().toHexString(true);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const range = (n) => [...Array(n).keys()];
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
export async function parallelForEach(iterable, fn) {
  const result = [];
  for await (const item of iterable) {
    result.push(fn(item));
  }
  return await Promise.allSettled(result);
}
/**
 * A version of `Promise.all` that waits for all Promises to settle,
 * and if any are rejected, throws an `AggregateError` with all errors.
 *
 * This has the benefit of allowing all Promises to complete, rather than
 * failing fast on the first rejection (and potentially leaving more Promises
 * in an unhandled rejection state).
 */
export async function safePromiseAll(promises) {
  const results = await Promise.allSettled(promises);
  const rejected = results.filter((r) => r.status === 'rejected');
  if (rejected.length) {
    if (rejected.length === 1) throw rejected[0].reason;
    throw new AggregateError(
      [rejected.map((r) => r.reason)],
      `${rejected.length} errors: ${rejected.map((r) => r.reason).join(', ')}`,
    );
  }
  return results.map((r) => r.value);
}
export function pick(obj, keys) {
  const ret = {};
  for (const key of Object.keys(obj)) {
    if (keys.includes(key)) {
      ret[key] = obj[key];
    }
  }
  return ret;
}
export function jsonClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
export function makeConnectionString(
  hostport,
  replSetName,
  defaultConnectionOptions = {},
) {
  const cs = new ConnectionString(`mongodb://${hostport}/`);
  if (replSetName) {
    cs.typedSearchParams().set('replicaSet', replSetName);
  }
  if (defaultConnectionOptions.tls) {
    cs.typedSearchParams().set('tls', 'true');
  }
  if (defaultConnectionOptions.tlsCAFile) {
    cs.typedSearchParams().set('tlsCAFile', defaultConnectionOptions.tlsCAFile);
  }
  if (defaultConnectionOptions.tlsCertificateKeyFile) {
    cs.typedSearchParams().set(
      'tlsCertificateKeyFile',
      defaultConnectionOptions.tlsCertificateKeyFile,
    );
  }
  if (defaultConnectionOptions.tlsCertificateKeyFilePassword) {
    cs.typedSearchParams().set(
      'tlsCertificateKeyFilePassword',
      defaultConnectionOptions.tlsCertificateKeyFilePassword,
    );
  }
  if (defaultConnectionOptions.tlsAllowInvalidCertificates) {
    cs.typedSearchParams().set('tlsAllowInvalidCertificates', 'true');
  }
  if (defaultConnectionOptions.auth?.username) {
    cs.username = defaultConnectionOptions.auth.username;
  }
  if (defaultConnectionOptions.auth?.password) {
    cs.password = defaultConnectionOptions.auth.password;
  }
  return cs.toString();
}
export async function eventually(
  fn,
  { intervalMs = 100, timeoutMs = 5000 } = {},
) {
  const startTime = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await fn();
      return;
    } catch (err) {
      if (Date.now() - startTime > timeoutMs) {
        throw err;
      } else {
        await sleep(intervalMs);
      }
    }
  }
}
