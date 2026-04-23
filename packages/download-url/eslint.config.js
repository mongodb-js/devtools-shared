'use strict';

const devtoolsConfig = require('@mongodb-js/eslint-config-devtools');

module.exports = [
  ...devtoolsConfig({
    tsconfigRootDir: __dirname,
    project: ['./tsconfig-lint.json'],
  }),
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
    },
  },
];
