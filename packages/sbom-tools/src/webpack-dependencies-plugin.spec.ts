import { expect } from 'chai';
import path from 'path';
import { promises as fs } from 'fs';
import { default as webpackCb } from 'webpack';
import util from 'util';

import type { WebpackDependenciesPluginOptions } from './webpack-dependencies-plugin';
import { WebpackDependenciesPlugin } from './webpack-dependencies-plugin';
import type { Package } from './get-package-info';
import { withTempDir } from '../test/helpers';

const webpack = util.promisify(webpackCb);

async function runPlugin(
  structure: Record<string, string>,
  options: WebpackDependenciesPluginOptions,
  webpackConfig?: { runtime: boolean }
): Promise<Package[]> {
  return withTempDir(structure, async (contextPath) => {
    const outputPath =
      options.outputFilename ?? path.join(contextPath, 'dependencies.json');

    const plugin = new WebpackDependenciesPlugin(options);
    const config = (await fs.readdir(path.join(contextPath, 'src')))
      .filter(
        (filename) => filename.startsWith('input') && filename.endsWith('.js')
      )
      .map((filename, i) => ({
        context: contextPath,
        entry: path.resolve(contextPath, 'src', filename),
        output: {
          path: path.resolve(contextPath, 'dist'),
          filename: `output-${i}.js`,
        },

        plugins: [plugin],
        ...(webpackConfig?.runtime
          ? {
              output: {
                path: path.resolve(contextPath, 'dist'),
                filename: `output-[name]-${i}.js`,
              },
              optimization: {
                runtimeChunk: 'single',
              } as { runtimeChunk: 'single' },
            }
          : {}),
      }));

    const stats = await webpack(config);

    if (stats && stats.hasErrors()) {
      throw new Error(
        JSON.stringify(stats.toJson().errors) ??
          'Compilation stats contains errors.'
      );
    }

    return JSON.parse(await fs.readFile(outputPath, 'utf-8')).map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ path: _, ...rest }) => rest
    );
  });
}

describe('WebpackDependenciesPlugin', function () {
  it('returns an empty dependencies file if there are no modules', async function () {
    const structure = {
      'src/input.js': '',
    };

    const dependencies = await runPlugin(structure, {});
    expect(dependencies).to.deep.equal([]);
  });

  it('does not return internal modules', async function () {
    const structure = {
      'src/input.js': 'require("./input2")',
      'src/input2.js': '',
    };

    const dependencies = await runPlugin(structure, {});
    expect(dependencies).to.deep.equal([]);
  });

  it('returns a dependency if found', async function () {
    const structure = {
      'package.json': JSON.stringify({
        name: 'my-package',
      }),
      'src/input.js': 'require("pkg1")',
      'node_modules/pkg1/package.json': JSON.stringify({
        name: 'pkg1',
        version: '0.1.0',
      }),
      'node_modules/pkg1/index.js': '',
    };

    const dependencies = await runPlugin(structure, {});

    expect(dependencies).to.deep.equal([
      {
        licenseFiles: [],
        name: 'pkg1',
        version: '0.1.0',
      },
    ]);
  });

  it('works with multiple configs', async function () {
    const structure = {
      'package.json': JSON.stringify({
        name: 'my-package',
      }),
      'src/input1.js': 'require("pkg1")',
      'src/input2.js': 'require("pkg2")',
      'node_modules/pkg1/package.json': JSON.stringify({
        name: 'pkg1',
        version: '0.1.0',
      }),
      'node_modules/pkg1/index.js': '',
      'node_modules/pkg2/package.json': JSON.stringify({
        name: 'pkg2',
        version: '0.1.0',
      }),
      'node_modules/pkg2/index.js': '',
    };

    const dependencies = await runPlugin(structure, {});

    expect(dependencies).to.deep.equal([
      {
        licenseFiles: [],
        name: 'pkg1',
        version: '0.1.0',
      },
      {
        licenseFiles: [],
        name: 'pkg2',
        version: '0.1.0',
      },
    ]);
  });

  it('returns a dependency of an internal module', async function () {
    const structure = {
      'package.json': JSON.stringify({
        name: 'my-package',
      }),
      'src/input.js': 'require("./input2")',
      'src/input2.js': 'require("pkg1")',
      'node_modules/pkg1/package.json': JSON.stringify({
        name: 'pkg1',
        version: '0.1.0',
      }),
      'node_modules/pkg1/index.js': '',
    };

    const dependencies = await runPlugin(structure, {});

    expect(dependencies).to.deep.equal([
      {
        licenseFiles: [],
        name: 'pkg1',
        version: '0.1.0',
      },
    ]);
  });

  it('returns production and optional dependencies with transitive deps if includeExternalProductionDependencies is true', async function () {
    const structure = {
      'package.json': JSON.stringify({
        name: 'my-package',
        dependencies: {
          pkg1: '^0.1.0',
        },
        optionalDependencies: {
          'opt-installed': '^0.1.0',
          'opt-missing': '^0.1.0',
        },
      }),
      'src/input.js': '',
      'node_modules/pkg1/package.json': JSON.stringify({
        name: 'pkg1',
        version: '0.1.0',
        dependencies: {
          pkg2: '^0.1.0',
        },
      }),
      'node_modules/pkg1/index.js': '',
      'node_modules/opt-installed/package.json': JSON.stringify({
        name: 'opt-installed',
        version: '0.1.0',
        dependencies: {
          pkg3: '^0.1.0',
        },
      }),
      'node_modules/opt-installed/index.js': '',
      'node_modules/pkg2/package.json': JSON.stringify({
        name: 'pkg2',
        version: '0.1.0',
      }),
      'node_modules/pkg2/index.js': '',
      'node_modules/pkg3/package.json': JSON.stringify({
        name: 'pkg3',
        version: '0.1.0',
      }),
      'node_modules/pkg3/index.js': '',
    };

    const dependencies = await runPlugin(structure, {
      includeExternalProductionDependencies: true,
    });

    expect(dependencies).to.have.deep.members([
      {
        licenseFiles: [],
        name: 'pkg1',
        version: '0.1.0',
      },
      {
        licenseFiles: [],
        name: 'pkg2',
        version: '0.1.0',
      },
      {
        licenseFiles: [],
        name: 'opt-installed',
        version: '0.1.0',
      },
      {
        licenseFiles: [],
        name: 'pkg3',
        version: '0.1.0',
      },
    ]);
  });

  it('includes webpack among the dependencies if the bundle includes webpack runtime', async function () {
    const structure = {
      'package.json': JSON.stringify({
        name: 'my-package',
        dependencies: {
          pkg1: '^0.1.0',
        },
      }),
      'src/input.js': '',
      'node_modules/pkg1/package.json': JSON.stringify({
        name: 'pkg1',
        version: '0.1.0',
      }),
      'node_modules/pkg1/index.js': '',
    };

    const dependencies = await runPlugin(structure, {}, { runtime: true });

    expect(dependencies).to.deep.equal([
      {
        license: 'MIT',
        licenseFiles: [
          {
            content: await fs.readFile(
              require.resolve('webpack/LICENSE'),
              'utf-8'
            ),
            filename: 'LICENSE',
          },
        ],
        name: 'webpack',

        version: JSON.parse(
          await fs.readFile(require.resolve('webpack/package.json'), 'utf-8')
        ).version,
      },
    ]);
  });
  it('returns dependencies included with if includePackages', async function () {
    const structure = {
      'package.json': JSON.stringify({
        name: 'my-package',
        dependencies: {
          pkg1: '^0.1.0',
        },
      }),
      'src/input.js': '',
      'node_modules/pkg1/package.json': JSON.stringify({
        name: 'pkg1',
        version: '0.1.0',
      }),
      'node_modules/pkg1/index.js': '',
    };

    const dependencies = await runPlugin(structure, {
      includePackages: ['pkg1'],
    });

    expect(dependencies).to.deep.equal([
      {
        licenseFiles: [],
        name: 'pkg1',
        version: '0.1.0',
      },
    ]);
  });

  it('returns license info', async function () {
    const structure = {
      'package.json': JSON.stringify({
        name: 'my-package',
      }),
      'src/input.js': 'require("pkg1")',
      'node_modules/pkg1/package.json': JSON.stringify({
        name: 'pkg1',
        version: '0.1.0',
        license: 'MIT',
      }),
      'node_modules/pkg1/index.js': '',
      'node_modules/pkg1/LICENSE': 'my-license',
      'node_modules/pkg1/COPYRIGHT': 'my-copyright',
    };

    const dependencies = await runPlugin(structure, {});

    expect(dependencies).to.deep.equal([
      {
        licenseFiles: [
          {
            content: 'my-copyright',
            filename: 'COPYRIGHT',
          },
          {
            content: 'my-license',
            filename: 'LICENSE',
          },
        ],
        name: 'pkg1',
        version: '0.1.0',
        license: 'MIT',
      },
    ]);
  });
});
