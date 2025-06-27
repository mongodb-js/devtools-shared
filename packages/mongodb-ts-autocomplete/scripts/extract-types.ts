/* eslint-disable no-console */
import { promises as fs } from 'fs';
import path from 'path';
import { replaceImports } from '../src/utils';

async function loadSources(sources: Record<string, string>) {
  const result: Record<string, string> = {};

  for (const [key, filepath] of Object.entries(sources)) {
    result[key] = replaceImports(await fs.readFile(filepath, 'utf8'));
  }

  return result;
}

async function run() {
  const input: Record<string, string> = {
    // mql imports bson but right now so does shell-api. We could bake the types
    // those use into the files we generate using api-extractor, but maybe
    // including it just once is not so bad.
    '/bson.ts': path.join(require.resolve('bson'), '..', '..', 'bson.d.ts'),
    // mql imports the mongodb driver. We could also use api-extractor there to
    // bake the few mongodb types we use into the schema.
    '/mongodb.ts': path.join(
      require.resolve('mongodb'),
      '..',
      '..',
      'mongodb.d.ts',
    ),
    // We wouldn't have to include mql if we used it straight from shell-api,
    // but since we're using it straight here for now to bypass the complicated
    // generics on the shell-api side it is included here for now.
    '/mql.ts': path.join(
      require.resolve('@mongodb-js/mql-typescript'),
      '..',
      '..',
      'out',
      'schema.d.ts',
    ),
  };
  const files = await loadSources(input);
  const code = `
const files = ${JSON.stringify(files)};
export default files;
  `;

  const filepath = path.join(
    __dirname,
    '..',
    'src',
    'fixtures',
    'autocomplete-types.ts',
  );
  console.log(filepath);
  await fs.mkdir(path.dirname(filepath), { recursive: true });
  await fs.writeFile(filepath, code, 'utf-8');
}

run()
  .then(() => {
    console.log('done');
  })
  .catch((err: Error) => {
    console.error(err.stack);
    process.exitCode = 1;
  });
