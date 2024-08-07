/* eslint-disable no-console */
import { execFile as execFileCallback } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';
import assert from 'assert';
import { createRequire } from 'module';
const execFile = promisify(execFileCallback);

(async function main() {
  const target = process.argv[2];
  if (!target) {
    throw new Error(
      'Usage: npx node-webpack-startup-snapshot-checker <filename>'
    );
  }

  const tmpdir = path.join(
    os.tmpdir(),
    `node-webpack-startup-snapshot-checker-${Date.now()}`
  );
  try {
    const entryFile = path.join(tmpdir, 'entry.js');
    const webpackConfig = path.join(tmpdir, 'webpack.config.js');
    await fs.mkdir(tmpdir, { recursive: true });

    await fs.writeFile(
      entryFile,
      `
'use strict';
const v8 = require('v8');
const target = require(${JSON.stringify(
        createRequire(process.cwd() + '/dummy.js').resolve(target)
      )});

function printTarget() {
  console.log(typeof target);
  if ((typeof target === 'object' || typeof target === 'function') && target) {
    for (const [key, value] of Object.entries(target)) {
      console.log(\`\${key} \${typeof value}\`);
    }
  }
}

if (v8.startupSnapshot.isBuildingSnapshot()) {
  v8.startupSnapshot.setDeserializeMainFunction(() => printTarget());
} else {
  printTarget();
}
`
    );

    await fs.writeFile(
      webpackConfig,
      `
'use strict';
const path = require("path");
module.exports = {
  devtool: false,
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'webpacked.js',
    library: { name: 'entry', type: 'var' }
  },
  module: {
    rules: [
      {
        test: /\\.node$/,
        loader: "null-loader",
      },
    ],
  },
  target: 'node',
  entry: './entry.js'
};
    `
    );

    const { stdout: originalOut } = await execFile('node', [entryFile], {
      cwd: tmpdir,
    });

    await execFile(
      'node',
      [
        path.resolve(
          require.resolve('webpack-cli'),
          '..',
          '..',
          'bin',
          'cli.js'
        ),
        '--mode',
        'development',
      ],
      {
        cwd: tmpdir,
      }
    );

    await execFile(
      'node',
      [
        '--snapshot-blob',
        'snapshot.blob',
        '--build-snapshot',
        path.join(tmpdir, 'dist', 'webpacked.js'),
      ],
      {
        cwd: tmpdir,
      }
    );

    const { stdout: webpackedOut } = await execFile(
      'node',
      ['--snapshot-blob', 'snapshot.blob'],
      {
        cwd: tmpdir,
      }
    );

    assert.deepStrictEqual(originalOut.split('\n'), webpackedOut.split('\n'));
  } finally {
    await fs.rm(tmpdir, { recursive: true, force: true });
  }
})().catch((err) => {
  process.nextTick(() => {
    if (err.stdout) console.error(err.stdout);
    if (err.stderr) console.error(err.stderr);
    throw err;
  });
});
