import path from 'path';
import { expect } from 'chai';
import { promises as fs } from 'fs';
import { sarifToMarkdown } from './sarif-to-markdown';

describe('sarif-to-markdown', function () {
  it('converts a SARIF JSON file to a simplified markdown representation of that file', async function () {
    const sarif = JSON.parse(
      await fs.readFile(
        path.resolve(
          __dirname,
          '..',
          '..',
          'test',
          'fixtures',
          'mock-sarif.json',
        ),
        'utf8',
      ),
    );
    const expectedMd = await fs.readFile(
      path.resolve(
        __dirname,
        '..',
        '..',
        'test',
        'fixtures',
        // .blob suffix to avoid prettier messing with things
        'mock-sarif.md.blob',
      ),
      'utf8',
    );
    expect(sarifToMarkdown({ sarif })).to.equal(expectedMd);
  });
});
