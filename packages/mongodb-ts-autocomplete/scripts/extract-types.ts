/* eslint-disable no-console */
import { promises as fs } from 'fs';
import path from 'path';
import ShellApiText from '@mongosh/shell-api/api';

function replaceImports(code: string) {
  // This just makes it possible to work on mql.ts because then the
  // IDE finds the import.
  return code.replace(/'bson'/g, "'/bson.ts'");
}

async function loadSources(sources: Record<string, string>) {
  const result: Record<string, string> = {};

  for (const [key, filepath] of Object.entries(sources)) {
    result[key] = replaceImports(await fs.readFile(filepath, 'utf8'));
  }

  return result;
}

async function run() {
  const input: Record<string, string> = {
    '/bson.ts': path.join(require.resolve('bson'), '..', '..', 'bson.d.ts'),
    '/mql.ts': path.join(__dirname, '..', 'src', 'fixtures', 'mql.ts'),
    '/shell-api.ts': path.join(
      require.resolve('@mongosh/shell-api'),
      '..',
      'api-processed.d.ts',
    ),
  };
  const files = await loadSources(input);
  files['./shell-api.ts'] = replaceImports(ShellApiText);
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
