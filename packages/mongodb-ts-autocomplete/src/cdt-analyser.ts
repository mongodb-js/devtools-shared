import ts from 'typescript';

export function compileSourceFile(code: string): ts.SourceFile {
  return ts.createSourceFile(
    '_initial_parsing.ts',
    code,
    ts.ScriptTarget.Latest,
    true,
  );
}

const QUERY_METHODS = ['aggregate', 'find', 'findOne'];

export function inferCollectionNameFromFunctionCall(
  sourceFile: ts.SourceFile,
): string | null {
  function findAggregateCallExpression(
    node: ts.Node,
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
