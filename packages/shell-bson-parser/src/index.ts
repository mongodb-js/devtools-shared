import type { parse as parseSync } from './parse.js';
import { toJSString } from './stringify.js';
import { ParseMode } from './options.js';
import { callWorker, terminateWorker } from './worker-client.js';

export const parse = (
  ...args: Parameters<typeof parseSync>
): Promise<ReturnType<typeof parseSync>> => callWorker(args);

export { ParseMode, toJSString, terminateWorker };

export default parse;
