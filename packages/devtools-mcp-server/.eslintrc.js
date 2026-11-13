module.exports = {
  root: true,
  extends: ['@mongodb-js/eslint-config-devtools'],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['./tsconfig-lint.json'],
  },
  overrides: [
    {
      // Test doubles implement async interfaces without awaiting anything.
      files: ['**/*.spec.ts'],
      rules: {
        '@typescript-eslint/require-await': 'off',
      },
    },
  ],
};
