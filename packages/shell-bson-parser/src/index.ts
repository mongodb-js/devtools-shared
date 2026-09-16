import type { parse as parseSync } from './parse';
import type { validate as validateSync } from './validators';
import type { toJSString as toJSStringSync } from './stringify';
import type { WorkerMethod } from './worker-client';
import { callWorker } from './worker-client';

export { ParseMode } from './parse';
export type { Options } from './options';

export {
  DEFAULT_COLLATION,
  DEFAULT_FILTER,
  DEFAULT_HINT,
  DEFAULT_LIMIT,
  DEFAULT_MAX_TIME_MS,
  DEFAULT_PROJECT,
  DEFAULT_SKIP,
  DEFAULT_SORT,
} from './validators';

export { terminateWorker } from './worker-client';

function execInWorker<Func extends (...args: any[]) => any>(
  method: WorkerMethod,
  ...args: Parameters<Func>
): Promise<ReturnType<Func>> {
  return callWorker<ReturnType<Func>>(method, args);
}

/** Parses shell syntax off the main thread. Resolves to the parsed value. */
export const parse = (
  ...args: Parameters<typeof parseSync>
): Promise<ReturnType<typeof parseSync>> => execInWorker('parse', ...args);

export const validate = (
  ...args: Parameters<typeof validateSync>
): Promise<ReturnType<typeof validateSync>> =>
  execInWorker('validate', ...args);

export const toJSString = (
  ...args: Parameters<typeof toJSStringSync>
): Promise<ReturnType<typeof toJSStringSync>> =>
  execInWorker('toJSString', ...args);

export default parse;
