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
    stringify: path.join(distDir, 'stringify.js'),
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
    {
      apply(compiler) {
        compiler.hooks.compilation.tap('worker-cjs-url', (compilation) => {
          compilation.hooks.processAssets.tap(
            {
              name: 'worker-cjs-url',
              stage: webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE,
            },
            () => {
              const source = compilation.getAsset('index.js').source.source();
              compilation.updateAsset(
                'index.js',
                new webpack.sources.RawSource(
                  source.toString().replace('./worker.mjs', './worker.cjs'),
                ),
              );
            },
          );
        });
      },
    },
    new webpack.DefinePlugin({
      'import.meta.url': 'require("node:url").pathToFileURL(__filename).href',
    }),
  ],
};
