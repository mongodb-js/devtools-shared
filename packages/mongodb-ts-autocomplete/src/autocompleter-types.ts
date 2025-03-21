import fs from 'fs';
import path from 'path';

const pathToBSONTypes = path.join(
  require.resolve('bson'),
  '..',
  '..',
  'bson.d.ts'
);

function replaceImports(code: string) {
  // This just makes it possible to work on bson-expressions.ts because then the
  // IDE finds the import.
  return code.replace(
    "import type * as bson from 'bson'",
    "import type * as bson from '/bson.ts'"
  );
}

// TODO: this file would be generated and include the typescript code as strings
// rather than reading them from disk
function loadFiles() {
  return {
    '/bson.ts': fs.readFileSync(pathToBSONTypes, 'utf8'),
    '/bson-expressions.ts': replaceImports(
      fs.readFileSync(
        path.join(__dirname, 'fixtures', 'bson-expressions.ts'),
        'utf8'
      )
    ),
    '/mql.ts': replaceImports(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'mql.ts'), 'utf8')
    ),
    '/shell-api.ts': replaceImports(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'shell-api.ts'), 'utf8')
    ),
  };
}

export default loadFiles;
