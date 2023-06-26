const path = require('path');
const findUp = require('find-up');

exports.MONOREPO_ROOT = path.dirname(
  findUp.sync('package.json', {
    // start above this package's package.json go either to this monorepo's root
    // or otherwise past node_modules to the calling monorepo's root
    cwd: path.resolve(__dirname, '..', '..'),
  })
);
