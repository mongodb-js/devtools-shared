'use strict';

const devtoolsConfig = require('@mongodb-js/eslint-config-devtools');

module.exports = [
  ...devtoolsConfig({
    tsconfigRootDir: __dirname,
    project: ['./tsconfig-lint.json'],
  }),
  {
    rules: {
      'no-console': 'off',
    },
  },
];
