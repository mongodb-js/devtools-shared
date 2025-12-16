'use strict';

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Using {} to initialize records means that keys present on Object.prototype will not be handled properly',
    },
    fixable: 'code',
    schema: [],
  },
  create(context) {
    return {
      VariableDeclarator(node) {
        if (
          node.id.type === 'Identifier' &&
          node.id.typeAnnotation &&
          node.id.typeAnnotation.typeAnnotation.type === 'TSTypeReference' &&
          node.id.typeAnnotation.typeAnnotation.typeName.name === 'Record' &&
          node.init &&
          node.init.type === 'ObjectExpression' &&
          !node.init.properties.some(
            (prop) =>
              prop.key.type === 'Identifier' && prop.key.name === '__proto__',
          )
        ) {
          context.report({
            node,
            message:
              '{} is not a good initializer for records. Use Object.create(null) instead.',
            fix:
              node.init.properties.length === 0
                ? (fixer) => fixer.replaceText(node.init, 'Object.create(null)')
                : (fixer) =>
                    fixer.insertTextBefore(
                      node.init.properties[0],
                      '__proto__: null, ',
                    ),
          });
        }
      },
    };
  },
};
