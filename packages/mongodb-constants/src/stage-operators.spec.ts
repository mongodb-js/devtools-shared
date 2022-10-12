import { expect } from 'chai';
import * as acorn from 'acorn';
import { STAGE_OPERATORS } from './stage-operators';

// Replaces any placeholder with a variable,
// the resulting snippet should always be parseable.
function replacePlaceholders(snippet: string): string {
  return snippet
    .replace(/\${\d+:?[A-z1-9.()]*}/g, 'x')
    .replace(/\.\.\./g, 'rest');
}

describe('stage operators', function () {
  STAGE_OPERATORS.forEach((operator) => {
    it(`${operator.name} has a properly formatted comment`, function () {
      expect(
        operator.comment.startsWith('/**\n'),
        'expected comment to be open'
      ).to.be.true;

      const commentLines = operator.comment.split('\n');
      commentLines.shift();
      commentLines.pop();
      commentLines.pop();

      for (const commentLine of commentLines) {
        expect(
          /^ \*( |$)/.test(commentLine),
          'expected comment to be indented properly'
        ).to.be.true;

        const spaces =
          /^ */.exec(commentLine.replace(/^ \* ?/, ''))?.[0].length ?? -1;
        expect(spaces % 2, 'expected comment to be indented properly').to.equal(
          0
        );
      }

      expect(
        operator.comment.endsWith('\n */\n'),
        'expected comment to be closed properly'
      ).to.be.true;
    });

    it(`${operator.name} has a properly formatted snippet`, function () {
      const snippet = replacePlaceholders(operator.snippet);

      expect(
        () => acorn.parseExpressionAt(snippet, 0, { ecmaVersion: 'latest' }),
        'expected snippet to parse'
      ).not.to.throw();

      const snippetLines = snippet.split('\n');

      for (const snippetLine of snippetLines) {
        const spaces = /^ */.exec(snippetLine)?.[0].length ?? -1;
        expect(spaces % 2, 'expected snippet to be indented properly').to.equal(
          0
        );
      }
    });
  });
});
