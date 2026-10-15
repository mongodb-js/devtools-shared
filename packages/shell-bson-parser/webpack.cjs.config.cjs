'use strict';
const path = require('path');

// Bundles the already tsc-compiled ESM dist/index.js into a standalone
// CommonJS entry point. The worker file stays same as in the ESM build.
module.exports = {
  mode: 'production',
  target: 'node',
  entry: path.resolve(__dirname, 'dist', 'index.js'),
  output: {
    path: path.resolve(__dirname, 'dist', 'cjs'),
    filename: 'index.js',
    library: {
      type: 'commonjs2',
    },
  },
  externals: [/^acorn/, /^javascript-stringify/, /^web-worker/, /^bson/],
  module: {
    parser: {
      javascript: {
        importExportsPresence: 'warn',
      },
    },
  },
};
