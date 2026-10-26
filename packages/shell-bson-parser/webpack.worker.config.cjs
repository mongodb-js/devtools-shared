'use strict';
const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, 'dist');

// Inlines the bundled worker as a string module, so consumers never have to
// resolve worker.js by path (which breaks once they bundle this package).
class InlineWorkerSourcePlugin {
  apply(compiler) {
    compiler.hooks.afterEmit.tap('InlineWorkerSourcePlugin', () => {
      const code = fs.readFileSync(path.join(distDir, 'worker.js'), 'utf8');
      fs.writeFileSync(
        path.join(distDir, 'worker-source.js'),
        `const workerSource = ${JSON.stringify(code)};\nexport default workerSource;\n`,
      );
      fs.rmSync(path.join(distDir, 'worker-source.js.map'), { force: true });
    });
  }
}

module.exports = {
  mode: 'production',
  target: 'webworker',
  entry: path.join(distDir, 'worker.js'),
  output: {
    path: distDir,
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
  plugins: [new InlineWorkerSourcePlugin()],
};
