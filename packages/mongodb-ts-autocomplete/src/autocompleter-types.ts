import fs from 'fs';
import path from 'path';

const pathToBSONTypes = path.join(
  require.resolve('bson'),
  '..',
  '..',
  'bson.d.ts'
);

function wrapTypes(code: string, referencePaths: string[] = []) {
  // This is a bit of a hack. Alternatively we can just import these files?

  const referenceLines = referencePaths.map(
    (path) => `/// <reference path="${path}" />`
  );
  return `
${referenceLines.join('\n')}

export {}; // turns this into an "external module"

// this has to be global otherwise the other files won't be able to use the
// namespace
declare global {
  export namespace bson {
    ${code.replace(/\bdeclare\b /g, '')}
  }
}
`;
}

// TODO: this file would be generated and include the typescript code as strings
// rather than reading them from disk
function loadFiles() {
  return {
    'bson.d.ts': wrapTypes(fs.readFileSync(pathToBSONTypes, 'utf8')),
    'bson-expressions.d.ts': fs.readFileSync(
      path.join(__dirname, 'fixtures', 'bson-expressions.d.ts'),
      'utf8'
    ),
    'mql.d.ts': fs.readFileSync(
      path.join(__dirname, 'fixtures', 'mql.d.ts'),
      'utf8'
    ),
    'shell-api.d.ts': fs.readFileSync(
      path.join(__dirname, 'fixtures', 'shell-api.d.ts'),
      'utf8'
    ),
  };
}

export default loadFiles;
