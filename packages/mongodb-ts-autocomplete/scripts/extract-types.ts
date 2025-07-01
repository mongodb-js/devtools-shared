/* eslint-disable no-console */
import * as ts from 'typescript';
import { promises as fs } from 'fs';
import path from 'path';
import { replaceImports } from '../src/utils';

async function loadSources(sources: Record<string, string>) {
  const result: Record<string, string | true> = {};

  for (const [key, filePath] of Object.entries(sources)) {
    // for .js filepaths we're never going to read them, so just make the
    // value true as an optimisation so we can still know that they should
    // exist during the language server's module resolution.
    try {
      const data = filePath.endsWith('.js')
        ? true
        : replaceImports(await fs.readFile(filePath, 'utf8'));
      result[key] = data;
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        console.error(`Error reading file ${filePath}:`, err);
        throw err;
      }
    }
  }

  return result;
}

function resolve(moduleName: string) {
  const result = ts.resolveModuleName(
    moduleName,
    __filename,
    {},
    {
      fileExists: (path: string) => ts.sys.fileExists(path),
      readFile: (path: string) => ts.sys.readFile(path),
    },
  );

  return result;
}

const deps: Record<string, string[]> = {
  '@mongodb-js/mongodb-ts-autocomplete': [
    // the module resolution won't be addressing this module by name, but we'll
    // feed it this package.json as a fallback when it tries to find itself
    'package.json',
  ],
  '@types/node': [
    'package.json',
    'assert.d.ts',
    'assert/strict.d.ts',
    'async_hooks.d.ts',
    'buffer.buffer.d.ts',
    'buffer.d.ts',
    'child_process.d.ts',
    'cluster.d.ts',
    'compatibility/disposable.d.ts',
    'compatibility/index.d.ts',
    'compatibility/indexable.d.ts',
    'compatibility/iterators.d.ts',
    'console.d.ts',
    'constants.d.ts',
    'crypto.d.ts',
    'dgram.d.ts',
    'diagnostics_channel.d.ts',
    'dns.d.ts',
    'dns/promises.d.ts',
    'dom-events.d.ts',
    'domain.d.ts',
    'events.d.ts',
    'fs.d.ts',
    'fs/promises.d.ts',
    'globals.d.ts',
    'globals.typedarray.d.ts',
    'http.d.ts',
    'http2.d.ts',
    'https.d.ts',
    'index.d.ts',
    'inspector.d.ts',
    'module.d.ts',
    'net.d.ts',
    'os.d.ts',
    'path.d.ts',
    'perf_hooks.d.ts',
    'process.d.ts',
    'punycode.d.ts',
    'querystring.d.ts',
    'readline.d.ts',
    'readline/promises.d.ts',
    'repl.d.ts',
    'sea.d.ts',
    'sqlite.d.ts',
    'stream.d.ts',
    'stream/consumers.d.ts',
    'stream/promises.d.ts',
    'stream/web.d.ts',
    'string_decoder.d.ts',
    'test.d.ts',
    'timers.d.ts',
    'timers/promises.d.ts',
    'tls.d.ts',
    'trace_events.d.ts',
    'tty.d.ts',
    'url.d.ts',
    'util.d.ts',
    'v8.d.ts',
    'vm.d.ts',
    'wasi.d.ts',
    'worker_threads.d.ts',
    'zlib.d.ts',
  ],
  assert: [
    'package.json',
    'assert.js', // exists only
  ],
  buffer: ['package.json', 'index.d.ts'],
  events: ['package.json'],
  punycode: [
    'package.json',
    'punycode.js', // exists only
  ],
  querystring: [
    'package.json',
    'index.js', // exists only
  ],
  string_decoder: [
    'package.json',
    'lib/string_decoder.js', // exists only
  ],
  typescript: [
    'package.json',
    'lib/es2023.ts',
    'lib/lib.decorators.d.ts',
    'lib/lib.decorators.legacy.d.ts',
    'lib/lib.es2015.collection.d.ts',
    'lib/lib.es2015.core.d.ts',
    'lib/lib.es2015.d.ts',
    'lib/lib.es2015.generator.d.ts',
    'lib/lib.es2015.iterable.d.ts',
    'lib/lib.es2015.promise.d.ts',
    'lib/lib.es2015.proxy.d.ts',
    'lib/lib.es2015.reflect.d.ts',
    'lib/lib.es2015.symbol.d.ts',
    'lib/lib.es2015.symbol.wellknown.d.ts',
    'lib/lib.es2016.array.include.d.ts',
    'lib/lib.es2016.d.ts',
    'lib/lib.es2016.intl.d.ts',
    'lib/lib.es2017.arraybuffer.d.ts',
    'lib/lib.es2017.d.ts',
    'lib/lib.es2017.date.d.ts',
    'lib/lib.es2017.intl.d.ts',
    'lib/lib.es2017.object.d.ts',
    'lib/lib.es2017.sharedmemory.d.ts',
    'lib/lib.es2017.string.d.ts',
    'lib/lib.es2017.typedarrays.d.ts',
    'lib/lib.es2018.asyncgenerator.d.ts',
    'lib/lib.es2018.asynciterable.d.ts',
    'lib/lib.es2018.d.ts',
    'lib/lib.es2018.intl.d.ts',
    'lib/lib.es2018.promise.d.ts',
    'lib/lib.es2018.regexp.d.ts',
    'lib/lib.es2019.array.d.ts',
    'lib/lib.es2019.d.ts',
    'lib/lib.es2019.intl.d.ts',
    'lib/lib.es2019.object.d.ts',
    'lib/lib.es2019.string.d.ts',
    'lib/lib.es2019.symbol.d.ts',
    'lib/lib.es2020.bigint.d.ts',
    'lib/lib.es2020.d.ts',
    'lib/lib.es2020.date.d.ts',
    'lib/lib.es2020.intl.d.ts',
    'lib/lib.es2020.number.d.ts',
    'lib/lib.es2020.promise.d.ts',
    'lib/lib.es2020.sharedmemory.d.ts',
    'lib/lib.es2020.string.d.ts',
    'lib/lib.es2020.symbol.wellknown.d.ts',
    'lib/lib.es5.d.ts',
  ],
  'undici-types': ['package.json', 'index.d.ts'],
  url: [
    'package.json',
    'url.js', // exists only
  ],
  util: [
    'package.json',
    'util.js', // exists only
  ],
};

async function run() {
  // TODO: switch require.resolve() to resolve()
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
  for (const [moduleName, filePaths] of Object.entries(deps)) {
    const { resolvedModule } = resolve(moduleName);
    if (!resolvedModule || !resolvedModule.packageId) {
      throw new Error(`Could not resolve module: ${moduleName}`);
    }

    const basePath = resolvedModule.resolvedFileName.slice(
      0,
      -resolvedModule.packageId.subModuleName.length,
    );
    //console.log({ basePath});
    for (const filePath of filePaths) {
      const fullPath = path.join(basePath, filePath);
      //console.log({ fullPath });
      // these are in the format import of typescript imports
      input[`${moduleName}/${filePath}`] = fullPath;
    }
  }

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
