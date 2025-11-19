'use strict';

const PROPERTY_TERMINATORS = [
  'ok',
  'true',
  'false',
  'null',
  'undefined',
  'exist',
  'empty',
  'arguments',
];

function followNodeChainToExpectCall(node) {
  while (node) {
    if (node.type === 'CallExpression') {
      if (node.callee.type === 'Identifier' && node.callee.name === 'expect') {
        return node;
      }
      if (node.callee.type === 'MemberExpression') {
        node = node.callee.object;
        continue;
      }
    }

    // Continue on the node chain (e.g. .not, .to).
    if (node.type === 'MemberExpression') {
      node = node.object;
      continue;
    }

    break;
  }
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require invocation of expect method assertions (e.g., to.throw())',
    },
    messages: {
      methodNotInvoked:
        'expect().to.[METHOD] must be invoked with parentheses, e.g., expect(() => someFn()).to.throw()',
    },
  },

  create(context) {
    return {
      MemberExpression(node) {
        if (
          node.type !== 'MemberExpression' ||
          PROPERTY_TERMINATORS.includes(node.property.name) ||
          node.property.name === 'expect'
        ) {
          return null;
        }

        const isInvoked =
          node.parent &&
          node.parent.type === 'CallExpression' &&
          node.parent.callee === node;

        const isPartOfLongerChain =
          node.parent &&
          node.parent.type === 'MemberExpression' &&
          node.parent.object === node;

        if (isInvoked || isPartOfLongerChain) {
          return null;
        }

        const expectCall = followNodeChainToExpectCall(node);
        if (!expectCall) {
          return null;
        }

        context.report({
          node,
          messageId: 'methodNotInvoked',
        });
      },
    };
  },
};
