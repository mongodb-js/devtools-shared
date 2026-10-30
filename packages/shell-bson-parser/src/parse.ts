import { getLineInfo, parse as parseAST } from 'acorn';
import type { Node } from 'estree';

import { checkTree } from './check.js';
import { executeAST } from './eval.js';
import type { Options } from './options.js';
import { buildOptions } from './options.js';

const WRAPPER_PREFIX = '(\n';
const WRAPPER_SUFFIX = '\n)';

function buildAST(input: string): { ast: Node; firstComment?: number } {
  let firstComment: number | undefined;

  const ast = parseAST(input, {
    ecmaVersion: 6,
    onComment: (_block, _text, start) => (firstComment ??= start),
    locations: true,
    ranges: true,
    sourceFile: input,
  }) as Node;

  return {
    ast,
    firstComment,
  };
}

type LocatedError = {
  pos: number;
  raisedAt?: number;
  loc?: { line: number; column: number };
  message?: string;
};

function toInputLocation(
  err: unknown,
  input: string,
  wrapped: string,
): unknown {
  if (
    typeof err !== 'object' ||
    err === null ||
    typeof (err as LocatedError).pos !== 'number'
  ) {
    return err;
  }
  const error = err as LocatedError;
  const toInputPos = (pos: number) =>
    Math.min(Math.max(pos - WRAPPER_PREFIX.length, 0), input.length);
  const wrappedLoc = error.loc;

  error.pos = toInputPos(error.pos);
  if (typeof error.raisedAt === 'number') {
    error.raisedAt = toInputPos(error.raisedAt);
  }
  const { line, column } = getLineInfo(input, error.pos);
  error.loc = { line, column };

  // acorn appends location and source to the message, e.g. "(2:5) in (\n...\n)"
  if (wrappedLoc && typeof error.message === 'string') {
    error.message = error.message.replace(
      `(${wrappedLoc.line}:${wrappedLoc.column}) in ${wrapped}`,
      `(${line}:${column}) in ${input}`,
    );
  }
  return err;
}

export function parse(input: string, options?: Partial<Options>) {
  const parsedOptions = buildOptions(options);

  const wrapped = `${WRAPPER_PREFIX}${input}${WRAPPER_SUFFIX}`;
  try {
    const { firstComment, ast } = buildAST(wrapped);

    if (firstComment !== undefined && !parsedOptions.allowComments) {
      throw Object.assign(new Error('Comments are not allowed'), {
        pos: firstComment,
      });
    }

    checkTree(ast, parsedOptions);
    return executeAST(ast);
  } catch (err) {
    throw toInputLocation(err, input, wrapped);
  }
}
