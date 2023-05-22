import { expect } from 'chai';
import path from 'path';
import fs from 'fs';
import webpack from 'webpack';
import type { WebpackDependenciesPluginOptions } from './webpack-dependencies-plugin';
import { WebpackDependenciesPlugin } from './webpack-dependencies-plugin';
import type { Package } from './get-package-info';
import { cleanup, setupTempDir, toCleanup } from '../test/helpers';

function runPlugin(
  structure: Record<string, string>,
  options: WebpackDependenciesPluginOptions
): Promise<Package[]> {
  const contextPath = setupTempDir(structure);

  const outputPath =
    options.outputFilename ?? path.join(contextPath, 'dependencies.json');
  toCleanup.push(outputPath);

  return new Promise((resolve, reject) => {
    const plugin = new WebpackDependenciesPlugin(options);
    const config = fs
      .readdirSync(path.join(contextPath, './src'))
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
      }));

    webpack(config, (err, stats) => {
      if (err) {
        return reject(err);
      }

      if (stats && stats.hasErrors()) {
        return reject(
          new Error(
            JSON.stringify(stats.toJson().errors) ??
              'Compilation stats contains errors.'
          )
        );
      }

      resolve(
        JSON.parse(fs.readFileSync(outputPath, 'utf-8')).map(
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          ({ path: _, ...rest }) => rest
        )
      );
    });
  });
}

describe('WebpackDependenciesPlugin', function () {
  after(cleanup);

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
