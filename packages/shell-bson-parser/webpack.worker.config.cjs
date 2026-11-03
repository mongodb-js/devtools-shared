'use strict';
const path = require('path');

const distDir = path.resolve(__dirname, 'dist');

const base = {
  mode: 'production',
  target: 'webworker',
  entry: path.join(distDir, 'worker.mjs'),
  module: {
    parser: {
      javascript: {
        // `bson.Map` trips webpack's static named-export check
        // Reducing error to warn
        importExportsPresence: 'warn',
      },
    },
  },
};

module.exports = [
  {
    ...base,
    name: 'worker-cjs',
    output: { path: path.join(distDir, 'cjs'), filename: 'worker.cjs' },
  },
  {
    ...base,
    name: 'worker-esm',
    dependencies: ['worker-cjs'],
    output: { path: distDir, filename: 'worker.mjs' },
  },
];
