'use strict';

const tseslint = require('typescript-eslint');
const pluginReact = require('eslint-plugin-react');
const pluginReactHooks = require('eslint-plugin-react-hooks');
const pluginJsxA11y = require('eslint-plugin-jsx-a11y');
const pluginMocha = require('eslint-plugin-mocha');
const pluginFilenameRules = require('eslint-plugin-filename-rules');
const pluginDevtools = require('@mongodb-js/eslint-plugin-devtools');
const globals = require('globals');

// The one that the library comes with doesn't allow for numbers and files
// starting with dots, this modified version handles those
const kebabcase = /^\.?([a-z0-9]+-)*[a-z0-9]+(?:\..*)?$/;

const jsRules = {
  eqeqeq: 'error',
  'no-console': 'error',
};

const tsRules = {
  ...jsRules,
  '@typescript-eslint/no-unused-vars': [
    'error',
    {
      destructuredArrayIgnorePattern: '^_',
      argsIgnorePattern: '^_',
      ignoreRestSiblings: true,
    },
  ],
  '@typescript-eslint/no-unsafe-assignment': 'off',
  '@typescript-eslint/no-unsafe-call': 'off',
  '@typescript-eslint/no-unsafe-member-access': 'off',
  '@typescript-eslint/no-unsafe-return': 'off',
  '@typescript-eslint/no-unsafe-argument': 'warn',
  '@typescript-eslint/consistent-type-imports': [
    'error',
    { prefer: 'type-imports' },
  ],
  '@mongodb-js/devtools/no-plain-object-records': 'error',
};

const testRules = {
  'no-console': 'off',
  'mocha/no-exclusive-tests': 'error',
  'mocha/no-hooks-for-single-case': 'off',
  'mocha/no-setup-in-describe': 'off',
  '@typescript-eslint/no-explicit-any': 'off',
  '@typescript-eslint/no-empty-function': 'off',
  '@mongodb-js/devtools/no-expect-method-without-call': 'error',
};

const testFiles = [
  '**/*.spec.js',
  '**/*.spec.jsx',
  '**/*.spec.ts',
  '**/*.spec.tsx',
  '**/*.test.js',
  '**/*.test.jsx',
  '**/*.test.ts',
  '**/*.test.tsx',
];

function config({ tsconfigRootDir, project } = {}) {
  return tseslint.config(
    {
      plugins: {
        'filename-rules': pluginFilenameRules,
        '@mongodb-js/devtools': pluginDevtools,
      },
      rules: {
        'filename-rules/match': ['error', kebabcase],
      },
    },
    // JavaScript files
    {
      files: ['**/*.js', '**/*.jsx'],
      languageOptions: {
        globals: { ...globals.node, ...globals.es2020 },
        parser: require('@babel/eslint-parser'),
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
      },
      rules: { ...jsRules },
    },
    // JSX files (adds react plugin)
    {
      files: ['**/*.jsx', '**/*.tsx'],
      plugins: {
        react: pluginReact,
        'react-hooks': pluginReactHooks,
        'jsx-a11y': pluginJsxA11y,
      },
      settings: {
        react: { version: 'detect' },
      },
      rules: {
        ...pluginReact.configs.recommended.rules,
        ...pluginReactHooks.configs.recommended.rules,
        ...pluginJsxA11y.configs.recommended.rules,
        'react/prop-types': 'off',
      },
    },
    // TypeScript files
    {
      files: ['**/*.ts', '**/*.tsx'],
      extends: [
        ...tseslint.configs.recommended,
        ...tseslint.configs.recommendedTypeChecked,
      ],
      languageOptions: {
        parserOptions: {
          tsconfigRootDir,
          project: project ?? true,
        },
      },
      rules: { ...tsRules },
    },
    // Test files
    {
      files: testFiles,
      plugins: { mocha: pluginMocha },
      languageOptions: {
        globals: { ...globals.mocha },
      },
      rules: {
        ...pluginMocha.configs.recommended.rules,
        ...testRules,
      },
    },
  );
}

module.exports = config;
module.exports.config = config;
