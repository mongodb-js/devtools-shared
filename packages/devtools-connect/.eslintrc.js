module.exports = {
  root: true,
  extends: [
    'semistandard',
    'plugin:promise/recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 0,
    '@typescript-eslint/no-empty-function': 0,
    'no-return-assign': 0,
    'no-use-before-define': 0,
    'comma-dangle': 0,
    'space-before-function-paren': 0,
    '@typescript-eslint/no-var-requires': 0,
    indent: 0,
  },
};
