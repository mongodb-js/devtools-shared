import ts from 'typescript';

export function compileSourceFile(code: string): ts.SourceFile {
  return ts.createSourceFile(
    '_initial_parsing.ts',
    code,
    ts.ScriptTarget.Latest,
    true
  );
}

function evaluateNode(node: ts.Node): any {
  if (ts.isObjectLiteralExpression(node)) {
    const obj: Record<string, any> = {};
    node.properties.forEach((prop: ts.ObjectLiteralElementLike) => {
      if (ts.isPropertyAssignment(prop)) {
        const key = prop.name.getText();
        obj[key] = evaluateNode(prop.initializer);
      }
    });
    return obj;
  } else if (ts.isArrayLiteralExpression(node)) {
    return node.elements.map(evaluateNode);
  } else if (ts.isStringLiteral(node)) {
    return node.text;
  } else if (ts.isNumericLiteral(node)) {
    return parseFloat(node.text);
  } else if (
    ts.isPrefixUnaryExpression(node) &&
    node.operator === ts.SyntaxKind.MinusToken
  ) {
    return -evaluateNode(node.operand);
  } else if (node.getText() === 'true') {
    return true;
  } else if (node.getText() === 'false') {
    return false;
  }
  return null;
}

function findMethodCallNodeAtPosition(
  node: ts.Node,
  caret: number
): ts.CallExpression | undefined {
  if (ts.isCallExpression(node)) {
    const methodName = node.expression;
    if (ts.isPropertyAccessExpression(methodName) && node.getEnd() >= caret) {
      return node;
    }
  }

  return node.forEachChild((child) =>
    findMethodCallNodeAtPosition(child, caret)
  );
}

const QUERY_METHODS = ['aggregate', 'find', 'findOne'];

export function inferCollectionNameFromFunctionCall(
  sourceFile: ts.SourceFile
): string | null {
  function findAggregateCallExpression(
    node: ts.Node
  ): ts.CallExpression | undefined {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression)
    ) {
      const methodAccess = node.expression;
      if (QUERY_METHODS.includes(methodAccess.name.getText())) {
        return node;
      }
    }
    return ts.forEachChild(node, findAggregateCallExpression);
  }

  const aggregateCallExpression = findAggregateCallExpression(sourceFile);

  if (aggregateCallExpression) {
    const aggregateExpression =
      aggregateCallExpression.expression as ts.PropertyAccessExpression;
    const dbIdentifier = aggregateExpression.expression;

    if (ts.isPropertyAccessExpression(dbIdentifier)) {
      return dbIdentifier.name.getText();
    }
  }

  return null;
}

export function inferMongoDBCommandFromFunctionCall(
  sourceFile: ts.SourceFile
): string | null {
  function findAggregateCallExpression(
    node: ts.Node
  ): ts.CallExpression | undefined {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression)
    ) {
      const methodAccess = node.expression;
      if (QUERY_METHODS.includes(methodAccess.name.getText())) {
        return node;
      }
    }
    return ts.forEachChild(node, findAggregateCallExpression);
  }

  const aggregateCallExpression = findAggregateCallExpression(sourceFile);

  if (aggregateCallExpression) {
    const aggregateExpression =
      aggregateCallExpression.expression as ts.PropertyAccessExpression;
    return aggregateExpression.name.getText();
  }

  return null;
}

export function extractPipelineUptoCaret(
  sourceFile: ts.SourceFile,
  caret: number
): Array<any> {
  const elementsBeforeCaret: Array<any> = [];

  function findArrayLiteralExpression(
    node: ts.Node,
    inArray: boolean = false
  ): ts.ArrayLiteralExpression | undefined {
    if (ts.isArrayLiteralExpression(node) && inArray) {
      return node;
    }

    return node.forEachChild((child) =>
      findArrayLiteralExpression(child, inArray || ts.isCallExpression(node))
    );
  }

  const arrayLiteralExpression = findArrayLiteralExpression(sourceFile, false);

  if (arrayLiteralExpression) {
    for (const element of arrayLiteralExpression.elements) {
      if (element.pos > caret) {
        continue;
      }

      const stage = evaluateNode(element);
      if (!stage || Object.keys(stage).length === 0) {
        continue;
      }

      elementsBeforeCaret.push(stage);
    }

    return elementsBeforeCaret;
  }

  return null;
}

export function extractPipelineFromLastAggregate(
  sourceFile: ts.SourceFile,
  caret: number
): ts.ArrayLiteralExpression | null {
  // Function to find the call expression node for 'aggregate' before the caret position
  function findAggregateCallExpressionAtPosition(
    node: ts.Node
  ): ts.CallExpression | undefined {
    if (ts.isCallExpression(node)) {
      const aggregateMethodAccess = node.expression;
      // Check if the application target is the aggregate method and the caret is after the call expression
      if (
        ts.isPropertyAccessExpression(aggregateMethodAccess) &&
        aggregateMethodAccess.name.getText(sourceFile) === 'aggregate'
      ) {
        return node;
      }
    }

    return ts.forEachChild(node, findAggregateCallExpressionAtPosition);
  }

  // Use the helper function to find the 'aggregate' call expression
  const aggregateCallExpression =
    findAggregateCallExpressionAtPosition(sourceFile);

  const elementsBeforeCaret: Array<any> = [];

  if (aggregateCallExpression) {
    const firstArg = aggregateCallExpression.arguments[0] as any;
    for (const element of firstArg.elements) {
      if (element.pos > caret) {
        continue;
      }

      const stage = evaluateNode(element);
      if (!stage || Object.keys(stage).length === 0) {
        continue;
      }

      elementsBeforeCaret.push(stage);
    }

    return elementsBeforeCaret as any;
  }

  return null; // Aggregate array argument not found
}

export function isInAggregationPipelinePosition(
  sourceFile: ts.SourceFile,
  position: number
): boolean {
  const currentMethod = inferMongoDBCommandFromFunctionCall(sourceFile);
  if (
    currentMethod === 'updateMany' ||
    currentMethod === 'updateOne' ||
    currentMethod === 'aggregate'
  ) {
    return extractPipelineUptoCaret(sourceFile, position) !== null;
  }

  return false;
}

export function getSymbolAtPosition(
  sourceFile: ts.SourceFile,
  position: number
): string | null {
  function findNodeAtPosition(node: ts.Node): ts.Node | undefined {
    if (position >= node.getStart(sourceFile) && position <= node.getEnd()) {
      return ts.forEachChild(node, findNodeAtPosition) || node;
    }

    return undefined;
  }

  let node = findNodeAtPosition(sourceFile);

  while (node && !ts.isIdentifier(node)) {
    if (node.parent) {
      node = node.parent;
    } else {
      break;
    }
  }

  return node && ts.isIdentifier(node) ? node.getText(sourceFile) : null;
}
