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
    // Keep the emitted worker at a stable `worker.js` so runtime resolution
    // next to this bundle finds it instead of a content-hashed name.
    assetModuleFilename: '[name][ext]',
    // Allow native `import()` for the `web-worker` external below.
    environment: {
      dynamicImport: true,
    },
    library: {
      type: 'commonjs2',
    },
  },
  // `web-worker` must resolve through its ESM entry: its CJS build mis-detects
  // jsdom as a browser and throws when constructing a worker.
  externals: [
    { 'web-worker': 'import web-worker' },
    /^acorn/,
    /^javascript-stringify/,
    /^bson/,
  ],
  module: {
    parser: {
      javascript: {
        importExportsPresence: 'warn',
      },
    },
  },
};
