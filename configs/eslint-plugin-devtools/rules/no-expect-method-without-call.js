'use strict';

const PROPERTY_TERMINATORS = [
  // Default chai terminators.
  'ok',
  'true',
  'false',
  'null',
  'undefined',
  'exist',
  'empty',
  'arguments',
  'NaN',
  'extensible',
  'sealed',
  'frozen',
  'finite',

  // Terminators from chai-as-promised.
  'fulfilled',
  'rejected',

  // Terminators from sinon-chai.
  'called',
  'calledOnce',
  'calledTwice',
  'calledThrice',
  'calledWithNew',

  // Terminators from chai-dom.
  'displayed',
  'visible',
  'focus',
  'checked',
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
  },

  create(context) {
    const options = context.options[0] ?? {};
    const additionalTerminators = options.properties ?? [];
    const validTerminators = [
      ...PROPERTY_TERMINATORS,
      ...additionalTerminators,
    ];

    return {
      MemberExpression(node) {
        if (
          node.type !== 'MemberExpression' ||
          validTerminators.includes(node.property.name) ||
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

        const source = context.getSourceCode();
        const calleeText = source.getText(node);
        const expectText = source.getText(expectCall);
        const assertionText = calleeText.substring(expectText.length + 1);

        context.report({
          node,
          // message: `"${assertionText}" used as function`
          message: `expect().${assertionText} must be invoked with parentheses, e.g., expect().${assertionText}()`,
        });
      },
    };
  },
};
