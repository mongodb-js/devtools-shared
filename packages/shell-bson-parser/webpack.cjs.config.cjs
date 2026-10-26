'use strict';
const path = require('path');

const distDir = path.resolve(__dirname, 'dist');
const cjsDir = path.join(distDir, 'cjs');

module.exports = {
  mode: 'production',
  target: 'node',
  entry: {
    index: path.join(distDir, 'index.js'),
  },
  output: {
    path: cjsDir,
    clean: true,
    filename: '[name].js',
    library: { type: 'commonjs2' },
    environment: { dynamicImport: true },
  },
  externals: [
    /^acorn/,
    /^javascript-stringify/,
    /^bson/,
    ({ request }, callback) =>
      request === './worker-source.js'
        ? callback(null, 'import ../worker-source.js')
        : callback(),
  ],
  module: {
    parser: {
      javascript: {
        importExportsPresence: 'warn',
      },
    },
  },
};
