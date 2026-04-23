'use strict';

const devtoolsConfig = require('@mongodb-js/eslint-config-devtools');

module.exports = [
  ...devtoolsConfig({
    tsconfigRootDir: __dirname,
    project: ['./tsconfig-lint.json'],
  }),
  {
    rules: {
      'no-return-assign': 'off',
      'no-use-before-define': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      'indent': 'off',
    },
  },
];
