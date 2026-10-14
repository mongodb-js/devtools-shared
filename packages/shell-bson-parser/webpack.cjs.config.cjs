'use strict';
const path = require('path');
const webpack = require('webpack');

const distDir = path.resolve(__dirname, 'dist');
const cjsDir = path.join(distDir, 'cjs');

module.exports = {
  mode: 'production',
  target: 'node',
  entry: {
    index: path.join(distDir, 'index.js'),
    'web-worker': {
      import: 'web-worker',
      library: { type: 'commonjs2', export: 'default' },
    },
  },
  resolve: { conditionNames: ['import', 'node', 'default'] },
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
    ({ request, contextInfo }, callback) => {
      if (request === 'web-worker' && contextInfo.issuer) {
        return callback(null, 'commonjs ./web-worker.js');
      }
      callback();
    },
  ],
  module: {
    parser: {
      javascript: {
        url: false,
        import: false,
        importExportsPresence: 'warn',
      },
    },
  },
  plugins: [
    new webpack.DefinePlugin({
      'import.meta.url': webpack.DefinePlugin.runtimeValue(
        ({ module }) =>
          module.resource === path.join(distDir, 'worker-client.js')
            ? 'require("node:url").pathToFileURL(require("node:path").join(__dirname, "..", "worker-client.js")).href'
            : 'require("node:url").pathToFileURL(__filename).href',
        true,
      ),
    }),
  ],
};
