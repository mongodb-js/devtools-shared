import type { Node, BaseCallExpression, Identifier } from 'estree';

import { GLOBAL_FUNCTIONS, isMethodWhitelisted, GLOBALS } from './scope';
import type { Options } from './options';

class Checker {
  constructor(private options: Options) {}
  /**
   * Only allow CallExpressions where the Identifier matches a whitelist of safe
   * globals, and where the arguments are themselves safe expressions
   */
  checkSafeCall = (node: BaseCallExpression) => {
    const allowMethods = this.options.allowMethods;

    if (node.callee.type === 'Identifier') {
      return (
        GLOBAL_FUNCTIONS.indexOf(node.callee.name) >= 0 &&
        node.arguments.every(this.checkSafeExpression)
      );
    }
    if (allowMethods) {
      if (node.callee.type === 'MemberExpression') {
        const object = node.callee.object;
        const property = node.callee.property as Identifier;
        // If we're only referring to identifiers, we don't need to check deeply.
        if (object.type === 'Identifier' && property.type === 'Identifier') {
          return (
            isMethodWhitelisted(object.name, property.name) &&
            node.arguments.every(this.checkSafeExpression)
          );
        } else if (
          (object.type === 'NewExpression' ||
            object.type === 'CallExpression') &&
          object.callee.type === 'Identifier'
        ) {
          const callee = object.callee;
          return (
            isMethodWhitelisted(callee.name, property.name) &&
            node.arguments.every(this.checkSafeExpression)
          );
        } else {
          return (
            this.checkSafeExpression(object) &&
            node.arguments.every(this.checkSafeExpression)
          );
        }
      }
    }
    return false;
  };

  /**
   * Only allow an arbitrarily selected list of 'safe' expressions to be used as
   * part of a query
   */
  checkSafeExpression = (node: Node | null): boolean => {
    switch (node?.type) {
      case 'Identifier':
        return Object.prototype.hasOwnProperty.call(GLOBALS, node.name);
      case 'Literal':
        return true;
      case 'ArrayExpression':
        return node.elements.every(this.checkSafeExpression);
      case 'UnaryExpression':
        // Note: this does allow using the `delete`, `typeof`, and `void` operators
        return this.checkSafeExpression(node.argument);
      case 'BinaryExpression':
        // Note: this does allow using the `instanceof`, `in`, and bitwise operators
        return (
          this.checkSafeExpression(node.left) &&
          this.checkSafeExpression(node.right)
        );
      case 'CallExpression':
      case 'NewExpression':
        // allows both `new Date(...)` and `Date(...)` function calls
        return this.checkSafeCall(node);
      case 'ObjectExpression':
        return node.properties.every((property) => {
          // don't allow computed values { [10 + 10]: ... }
          // don't allow method properties { start() {...} }
          if (
            ('computed' in property && property.computed) ||
            ('method' in property && property.method)
          )
            return false;
          // only allow literals { 10: ...} or identifiers { name: ... } as keys
          if (
            !('key' in property) ||
            !['Literal', 'Identifier'].includes(property.key.type)
          )
            return false;

          // object values can be a function expression or any safe expression
          return (
            'value' in property &&
            (['FunctionExpression', 'ArrowFunctionExpression'].includes(
              property.value.type
            ) ||
              this.checkSafeExpression(property.value))
          );
        });
      default:
        return false;
    }
  };
}

export const checkTree = (node: Node, options: Options) => {
  if (node.type === 'Program') {
    if (node.body.length === 1 && node.body[0].type === 'ExpressionStatement') {
      const checker = new Checker(options);
      return checker.checkSafeExpression(node.body[0].expression);
    }
  }
  return false;
};
