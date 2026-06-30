import assert from 'assert';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

import { getPackagesInTopologicalOrder } from './get-packages-in-topological-order';

async function createMonorepo(
  root: string,
  workspaces: string[],
  packages: Record<string, Record<string, any>>,
) {
  await fs.writeFile(
    path.join(root, 'package.json'),
    JSON.stringify({ workspaces }),
  );

  for (const [dir, packageJson] of Object.entries(packages)) {
    const pkgDir = path.join(root, dir);
    await fs.mkdir(pkgDir, { recursive: true });
    await fs.writeFile(
      path.join(pkgDir, 'package.json'),
      JSON.stringify(packageJson),
    );
  }
}

describe('getPackagesInTopologicalOrder', function () {
  let tmpDir: string;

  beforeEach(async function () {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'topo-test-'));
  });

  afterEach(async function () {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('returns a single package', async function () {
    await createMonorepo(tmpDir, ['packages/*'], {
      'packages/pkg-a': {
        name: 'pkg-a',
        version: '1.0.0',
      },
    });

    const result = await getPackagesInTopologicalOrder(tmpDir);

    assert.deepStrictEqual(
      result.map((p) => p.name),
      ['pkg-a'],
    );
    assert.strictEqual(result[0].version, '1.0.0');
    assert.strictEqual(result[0].private, false);
    assert.ok(result[0].location.endsWith(path.join('packages', 'pkg-a')));
  });

  it('sorts packages in topological order based on dependencies', async function () {
    await createMonorepo(tmpDir, ['packages/*'], {
      'packages/pkg-a': {
        name: 'pkg-a',
        version: '1.0.0',
        dependencies: { 'pkg-b': '^1.0.0' },
      },
      'packages/pkg-b': {
        name: 'pkg-b',
        version: '1.0.0',
      },
    });

    const result = await getPackagesInTopologicalOrder(tmpDir);
    const names = result.map((p) => p.name);

    assert.ok(
      names.indexOf('pkg-b') < names.indexOf('pkg-a'),
      `expected pkg-b before pkg-a, got: ${names.join(', ')}`,
    );
  });

  it('handles devDependencies for ordering', async function () {
    await createMonorepo(tmpDir, ['packages/*'], {
      'packages/pkg-a': {
        name: 'pkg-a',
        version: '2.0.0',
        devDependencies: { 'pkg-b': '^1.0.0' },
      },
      'packages/pkg-b': {
        name: 'pkg-b',
        version: '1.0.0',
      },
    });

    const result = await getPackagesInTopologicalOrder(tmpDir);
    const names = result.map((p) => p.name);

    assert.ok(
      names.indexOf('pkg-b') < names.indexOf('pkg-a'),
      `expected pkg-b before pkg-a, got: ${names.join(', ')}`,
    );
  });

  it('handles a chain of dependencies', async function () {
    await createMonorepo(tmpDir, ['packages/*'], {
      'packages/pkg-a': {
        name: 'pkg-a',
        version: '1.0.0',
        dependencies: { 'pkg-b': '^1.0.0' },
      },
      'packages/pkg-b': {
        name: 'pkg-b',
        version: '1.0.0',
        dependencies: { 'pkg-c': '^1.0.0' },
      },
      'packages/pkg-c': {
        name: 'pkg-c',
        version: '1.0.0',
      },
    });

    const result = await getPackagesInTopologicalOrder(tmpDir);
    const names = result.map((p) => p.name);

    assert.ok(
      names.indexOf('pkg-c') < names.indexOf('pkg-b'),
      `expected pkg-c before pkg-b, got: ${names.join(', ')}`,
    );
    assert.ok(
      names.indexOf('pkg-b') < names.indexOf('pkg-a'),
      `expected pkg-b before pkg-a, got: ${names.join(', ')}`,
    );
  });

  it('ignores external dependencies when sorting', async function () {
    await createMonorepo(tmpDir, ['packages/*'], {
      'packages/pkg-a': {
        name: 'pkg-a',
        version: '1.0.0',
        dependencies: { lodash: '^4.0.0', 'pkg-b': '^1.0.0' },
      },
      'packages/pkg-b': {
        name: 'pkg-b',
        version: '1.0.0',
        dependencies: { lodash: '^4.0.0' },
      },
    });

    const result = await getPackagesInTopologicalOrder(tmpDir);
    const names = result.map((p) => p.name);

    assert.strictEqual(names.length, 2);
    assert.ok(
      names.indexOf('pkg-b') < names.indexOf('pkg-a'),
      `expected pkg-b before pkg-a, got: ${names.join(', ')}`,
    );
  });

  it('returns the private field correctly', async function () {
    await createMonorepo(tmpDir, ['packages/*'], {
      'packages/pkg-a': {
        name: 'pkg-a',
        version: '1.0.0',
        private: true,
      },
      'packages/pkg-b': {
        name: 'pkg-b',
        version: '2.0.0',
      },
    });

    const result = await getPackagesInTopologicalOrder(tmpDir);
    const pkgA = result.find((p) => p.name === 'pkg-a');
    const pkgB = result.find((p) => p.name === 'pkg-b');

    assert.strictEqual(pkgA?.private, true);
    assert.strictEqual(pkgB?.private, false);
  });

  it('supports multiple workspace patterns', async function () {
    await createMonorepo(tmpDir, ['packages/*', 'configs/*'], {
      'packages/pkg-a': {
        name: 'pkg-a',
        version: '1.0.0',
        dependencies: { 'config-a': '^1.0.0' },
      },
      'configs/config-a': {
        name: 'config-a',
        version: '1.0.0',
      },
    });

    const result = await getPackagesInTopologicalOrder(tmpDir);
    const names = result.map((p) => p.name);

    assert.strictEqual(names.length, 2);
    assert.ok(names.includes('pkg-a'));
    assert.ok(names.includes('config-a'));
    assert.ok(
      names.indexOf('config-a') < names.indexOf('pkg-a'),
      `expected config-a before pkg-a, got: ${names.join(', ')}`,
    );
  });

  it('returns empty array when there are no workspaces', async function () {
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'root' }),
    );

    const result = await getPackagesInTopologicalOrder(tmpDir);

    assert.deepStrictEqual(result, []);
  });
});
