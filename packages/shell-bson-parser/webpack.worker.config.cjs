'use strict';
const path = require('path');

module.exports = {
  mode: 'production',
  target: 'webworker',
  entry: path.resolve(__dirname, 'dist', 'worker.js'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'worker.js',
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
