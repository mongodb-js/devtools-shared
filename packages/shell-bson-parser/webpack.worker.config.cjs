'use strict';
const path = require('path');

module.exports = {
  mode: 'production',
  target: 'webworker',
  entry: path.resolve(__dirname, 'dist', 'worker.mjs'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'worker.mjs',
  },
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
