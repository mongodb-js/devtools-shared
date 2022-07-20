const path = require('path');

module.exports = {
  MONOREPO_ROOT: path.resolve(__dirname, '..', '..', '..'),
  LERNA_BIN: path.resolve(
    __dirname,
    '..',
    '..',
    '..',
    'node_modules',
    '.bin',
    'lerna'
  ),
};
