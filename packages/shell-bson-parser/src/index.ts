import type { parse as parseSync } from './parse';
import type { validate as validateSync } from './validators';
import type { toJSString as toJSStringSync } from './stringify';
import type { WorkerMethod } from './worker-client';
import { callWorker } from './worker-client';

export { ParseMode } from './parse';

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

function execInWorker<Func extends (...args: any[]) => any>(
  method: WorkerMethod,
  ...args: Parameters<Func>
): Promise<ReturnType<Func>> {
  return callWorker<ReturnType<Func>>(method, args);
}

export const parse = (...args: Parameters<typeof parseSync>) =>
  execInWorker('parse', ...args);
export const validate = (...args: Parameters<typeof validateSync>) =>
  execInWorker('validate', ...args);
export const toJSString = (...args: Parameters<typeof toJSStringSync>) =>
  execInWorker('toJSString', ...args);

export default parse;
