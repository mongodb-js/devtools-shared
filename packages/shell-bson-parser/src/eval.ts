import type {
  UnaryExpression,
  BinaryExpression,
  Node,
  CallExpression,
  FunctionExpression,
  ArrowFunctionExpression,
} from 'estree';
import { getScopeFunction, getClass, GLOBALS } from './scope';

const unaryExpression = (node: UnaryExpression): any => {
  if (!node.prefix) throw new Error('Malformed UnaryExpression');
  switch (node.operator) {
    case '-':
      return -walk(node.argument);
    case '+':
      return +walk(node.argument);
    case '!':
      return !walk(node.argument);
    case '~':
      return ~walk(node.argument);
    default:
      throw new Error(`Invalid UnaryExpression Provided: '${node.operator}'`);
  }
};

const binaryExpression = (node: BinaryExpression): any => {
  const { left, right } = node;
  switch (node.operator) {
    case '==':
      // eslint-disable-next-line eqeqeq
      return walk(left) == walk(right);
    case '!=':
      // eslint-disable-next-line eqeqeq
      return walk(left) != walk(right);
    case '===':
      return walk(left) === walk(right);
    case '!==':
      return walk(left) !== walk(right);
    case '<':
      return walk(left) < walk(right);
    case '<=':
      return walk(left) <= walk(right);
    case '>':
      return walk(left) > walk(right);
    case '>=':
      return walk(left) >= walk(right);
    case '<<':
      return walk(left) << walk(right);
    case '>>':
      return walk(left) >> walk(right);
    case '>>>':
      return walk(left) >>> walk(right);
    case '+':
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
      return walk(left) + walk(right);
    case '-':
      return walk(left) - walk(right);
    case '*':
      return walk(left) * walk(right);
    case '/':
      return walk(left) / walk(right);
    case '%':
      return walk(left) % walk(right);
    case '**':
      return walk(left) ** walk(right);
    case '|':
      return walk(left) | walk(right);
    case '^':
      return walk(left) ^ walk(right);
    case '&':
      return walk(left) & walk(right);
    case 'in':
      return walk(left) in walk(right);
    case 'instanceof':
      return walk(left) instanceof walk(right);
    default:
      throw new Error(
        `Invalid BinaryExpression Provided: '${String(node.operator)}'`,
      );
  }
};

const memberExpression = (node: CallExpression, withNew: boolean): any => {
  switch (node.callee.type) {
    case 'Identifier': {
      // Handing <Constructor>() and new <Constructor>() cases
      const callee = getScopeFunction(node.callee.name, withNew);
      const args = node.arguments.map((arg) => walk(arg));
      return callee.apply(callee, args);
    }
    case 'MemberExpression': {
      // If they're using a static method or a member
      const calleeThis =
        node.callee.object.type === 'Identifier'
          ? getClass(node.callee.object.name)
          : walk(node.callee.object);

      const calleeFn =
        node.callee.property.type === 'Identifier' && node.callee.property.name;

      if (!calleeFn)
        throw new Error('Expected CallExpression property to be an identifier');

      const args = node.arguments.map((arg) => walk(arg));
      return calleeThis[calleeFn](...args);
    }
    default:
      throw new Error('Should not evaluate invalid expressions');
  }
};

const functionExpression = (
  node: FunctionExpression | ArrowFunctionExpression,
): string => {
  const source = node.loc?.source || '';
  const range = node.range || [];
  return source.slice(range[0], range[1]);
};

const walk = (node: Node | null): any => {
  switch (node?.type) {
    case 'Identifier':
      if (Object.prototype.hasOwnProperty.call(GLOBALS, node.name)) {
        return GLOBALS[node.name];
      }
      throw new Error(`${node.name} is not a valid Identifier`);
    case 'Literal':
      return node.value;
    case 'UnaryExpression':
      return unaryExpression(node);
    case 'BinaryExpression':
      return binaryExpression(node);
    case 'ArrayExpression':
      return node.elements.map((node) => walk(node));
    case 'CallExpression':
      return memberExpression(node, false);
    case 'NewExpression':
      return memberExpression(node, true);
    case 'ObjectExpression': {
      const obj: { [key: string]: any } = Object.create(null);
      for (const property of node.properties) {
        if (!('key' in property)) continue;
        const key =
          property.key.type === 'Identifier'
            ? property.key.name
            : walk(property.key);
        obj[key] = walk(property.value);
      }
      return { ...obj };
    }
    case 'FunctionExpression':
    case 'ArrowFunctionExpression':
      return functionExpression(node);
    default:
      throw new Error();
  }
};

export const executeAST = (node: Node) => {
  if (node.type === 'Program') {
    if (node.body.length === 1 && node.body[0].type === 'ExpressionStatement') {
      return walk(node.body[0].expression);
    }
  }
  throw new Error('Invalid AST Found');
};
