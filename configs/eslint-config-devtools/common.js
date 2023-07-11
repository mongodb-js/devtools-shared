'use strict';

const jsRules = {
  eqeqeq: 'error',
  'no-console': 'error',
};

const jsxRules = {
  ...jsRules,
};

const tsRules = {
  ...jsRules,
  '@typescript-eslint/no-unused-vars': 'error',
  '@typescript-eslint/no-unsafe-assignment': 'off',
  '@typescript-eslint/no-unsafe-call': 'off',
  '@typescript-eslint/no-unsafe-member-access': 'off',
  '@typescript-eslint/no-unsafe-return': 'off',
  '@typescript-eslint/no-unsafe-argument': 'warn',
  '@typescript-eslint/consistent-type-imports': [
    'error',
    { prefer: 'type-imports' },
  ],
};

const tsxRules = {
  ...tsRules,
  // No reason to have propTypes if your components are strictly typed
  'react/prop-types': 'off',
};

const testRules = {
  ...jsRules,
  'mocha/no-exclusive-tests': 'error',
  'mocha/no-hooks-for-single-case': 'off',
  'mocha/no-setup-in-describe': 'off',
  '@typescript-eslint/no-explicit-any': 'off',
  '@typescript-eslint/no-empty-function': 'off',
};

const jsConfigurations = ['eslint:recommended'];

const tsConfigurations = [
  ...jsConfigurations,
  'plugin:@typescript-eslint/recommended',
  'plugin:@typescript-eslint/recommended-requiring-type-checking',
];

const reactConfigurations = [
  'plugin:react/recommended',
  'plugin:react-hooks/recommended',
  'plugin:jsx-a11y/recommended',
];

const testConfigurations = ['plugin:mocha/recommended'];

const jsParserOptions = {
  parser: '@babel/eslint-parser',
  parserOptions: {
    ecmaVersion: 'latest',
    requireConfigFile: false,
    babelOptions: {
      presets: [
        require.resolve('@babel/preset-env'),
        require.resolve('@babel/preset-react'),
      ],
    },
  },
};

const tsParserOptions = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
  },
};

// The one that the library comes with doesn't allow for numbers and files
// starting with dots, this modified version handles those
const kebabcase = /^\.?([a-z0-9]+-)*[a-z0-9]+(?:\..*)?$/;

const jsOverrides = {
  files: ['**/*.js'],
  ...jsParserOptions,
  env: { node: true, es6: true },
  extends: [...jsConfigurations],
  rules: { ...jsRules },
};

const jsxOverrides = {
  files: ['**/*.jsx'],
  ...jsParserOptions,
  env: { node: true, browser: true, es6: true },
  extends: [...jsConfigurations, ...reactConfigurations],
  rules: { ...jsxRules },
};

const tsOverrides = {
  files: ['**/*.ts'],
  ...tsParserOptions,
  extends: [...tsConfigurations],
  rules: { ...tsRules },
};

const tsxOverrides = {
  files: ['**/*.tsx'],
  ...tsParserOptions,
  env: { node: true, browser: true },
  extends: [...tsConfigurations, ...reactConfigurations],
  rules: { ...tsxRules },
};

const testOverrides = {
  files: [
    '**/*.spec.js',
    '**/*.spec.jsx',
    '**/*.spec.ts',
    '**/*.spec.tsx',
    '**/*.test.js',
    '**/*.test.tsx',
    '**/*.test.ts',
  ],
  env: { mocha: true },
  extends: [...testConfigurations],
  rules: { ...testRules },
};

module.exports = {
  jsRules,
  jsxRules,
  tsRules,
  tsxRules,
  testRules,
  jsConfigurations,
  tsConfigurations,
  reactConfigurations,
  testConfigurations,
  jsParserOptions,
  tsParserOptions,
  kebabcase,
  jsOverrides,
  jsxOverrides,
  tsOverrides,
  tsxOverrides,
  testOverrides,
};
