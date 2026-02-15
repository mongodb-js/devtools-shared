const typescript = require('@rollup/plugin-typescript');
const pkg = require('./package.json');

const external = [
  ...Object.keys(pkg.dependencies),
  ...Object.keys(pkg.peerDependencies),
];

module.exports = [
  {
    input: 'src/index.ts',
    external,
    output: [
      {
        dir: 'dist',
        format: 'esm',
        entryFileNames: '[name].mjs',
        sourcemap: true,
        preserveModules: true,
      },
    ],
    plugins: [typescript()],
  },
  {
    input: 'src/index.ts',
    external,
    output: [
      {
        dir: 'dist',
        format: 'cjs',
        sourcemap: true,
        preserveModules: true,
        exports: 'named',
      },
    ],
    plugins: [
      typescript({
        declaration: false,
        declarationMap: false,
      }),
    ],
  },
];
