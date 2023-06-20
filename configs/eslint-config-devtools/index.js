'use strict';

const common = require('./common');

module.exports = {
  plugins: [
    '@typescript-eslint',
    'jsx-a11y',
    'mocha',
    'react',
    'react-hooks',
    'filename-rules',
  ],
  rules: {
    'filename-rules/match': ['error', common.kebabcase],
  },
  env: { node: true },
  overrides: [
    { ...common.jsOverrides },
    { ...common.jsxOverrides },
    { ...common.tsOverrides },
    { ...common.tsxOverrides },
    { ...common.testOverrides },
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
};
