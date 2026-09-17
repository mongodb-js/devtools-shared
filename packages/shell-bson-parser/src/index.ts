import { parse as parseSync } from './parse.js';
import { toJSString as toJSStringSync } from './stringify.js';
import { ParseMode } from './options.js';
import { callWorker, terminateWorker } from './worker-client.js';

export const parse = (
  ...args: Parameters<typeof parseSync>
): Promise<ReturnType<typeof parseSync>> => callWorker('parse', args);

export const toJSString = (
  ...args: Parameters<typeof toJSStringSync>
): Promise<ReturnType<typeof toJSStringSync>> => callWorker('toJSString', args);

export { ParseMode, parseSync, toJSStringSync, terminateWorker };

export default parse;
