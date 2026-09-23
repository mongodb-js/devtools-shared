import type { parse as parseSync } from './parse.js';
import { toJSString } from './stringify.js';
import { ParseMode } from './options.js';
import type { Options } from './options.js';
import { callWorker, terminateWorker } from './worker-client.js';
import type { ExecutionOptions } from './worker-client.js';

export const parse = (
  input: string,
  {
    executionTimeoutMs,
    ...parseOptions
  }: Partial<Options & ExecutionOptions> = {},
): Promise<ReturnType<typeof parseSync>> => {
  return callWorker([input, parseOptions], { executionTimeoutMs });
};

export { ParseMode, toJSString, terminateWorker };
export type { ExecutionOptions, Options as ParseOptions };

export default parse;
