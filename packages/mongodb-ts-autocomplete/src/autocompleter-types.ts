import fs from 'fs';
import path from 'path';

// TODO: this file would be generated and include the typescript code as strings
// rather than reading them from disk
function loadFiles() {
  return {
    'bson.d.ts': fs.readFileSync(
      path.join(__dirname, 'fixtures', 'bson.d.ts'),
      'utf8'
    ),
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
