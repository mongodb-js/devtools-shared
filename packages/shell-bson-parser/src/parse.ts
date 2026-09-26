import { parse as parseAST } from 'acorn';
import type { Node } from 'estree';

import { checkTree } from './check.js';
import { executeAST } from './eval.js';
import type { Options } from './options.js';
import { buildOptions } from './options.js';

function buildAST(input: string): { ast: Node; hasComments: boolean } {
  let hasComments = false;

  const ast = parseAST(input, {
    ecmaVersion: 6,
    onComment: () => (hasComments = true),
    locations: true,
    ranges: true,
    sourceFile: input,
  }) as Node;

  return {
    ast,
    hasComments,
  };
}

export function parse(input: string, options?: Partial<Options>) {
  const parsedOptions = buildOptions(options);

  const { hasComments, ast } = buildAST(
    // Wrapping input into brackets with newlines so that parser can correctly
    // process an expression and handle possible trailing comments
    `(\n${input}\n)`,
  );

  const passedCommentsCheck = !hasComments || parsedOptions.allowComments;

  if (passedCommentsCheck && checkTree(ast, parsedOptions)) {
    return executeAST(ast);
  }

  return '';
}
