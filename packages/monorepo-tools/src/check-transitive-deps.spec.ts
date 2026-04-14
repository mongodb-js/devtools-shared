import assert from 'assert';
import {
  matchesAnyPattern,
  satisfiesHighest,
  getDepsFromPackageJson,
  gatherTransitiveDepsInfo,
  findMisalignments,
} from './check-transitive-deps';

describe('check-transitive-deps', function () {
  describe('matchesAnyPattern', function () {
    it('matches an exact package name', function () {
      assert.equal(matchesAnyPattern('foo', ['foo']), true);
    });

    it('does not match a different name', function () {
      assert.equal(matchesAnyPattern('bar', ['foo']), false);
    });

    it('matches a scoped wildcard', function () {
      assert.equal(
        matchesAnyPattern('@mongodb-js/foo', ['@mongodb-js/*']),
        true,
      );
      assert.equal(
        matchesAnyPattern('@mongodb-js/bar', ['@mongodb-js/*']),
        true,
      );
    });

    it('does not match a different scope with a scoped wildcard', function () {
      assert.equal(
        matchesAnyPattern('@other-scope/foo', ['@mongodb-js/*']),
        false,
      );
    });

    it('does not let * match across a slash', function () {
      assert.equal(
        matchesAnyPattern('@mongodb-js/foo/bar', ['@mongodb-js/*']),
        false,
      );
    });

    it('matches a prefix wildcard', function () {
      assert.equal(matchesAnyPattern('mongodb-foo', ['mongodb-*']), true);
      assert.equal(matchesAnyPattern('mongodb-bar', ['mongodb-*']), true);
    });

    it('does not match when prefix does not fit', function () {
      assert.equal(matchesAnyPattern('other-foo', ['mongodb-*']), false);
    });

    it('matches against any pattern in the list', function () {
      assert.equal(
        matchesAnyPattern('foo', ['bar', '@mongodb-js/*', 'foo']),
        true,
      );
    });

    it('returns false for an empty pattern list', function () {
      assert.equal(matchesAnyPattern('foo', []), false);
    });

    it('escapes regex special characters in patterns', function () {
      assert.equal(matchesAnyPattern('foo.bar', ['foo.bar']), true);
      assert.equal(matchesAnyPattern('fooXbar', ['foo.bar']), false);
    });
  });

  describe('satisfiesHighest', function () {
    it('returns true when the range includes the highest minimum version', function () {
      assert.equal(satisfiesHighest('^1.0.0', '^1.5.0'), true);
    });

    it('returns false when the range excludes the highest minimum version', function () {
      assert.equal(satisfiesHighest('^1.0.0 <1.3.0', '^1.5.0'), false);
    });

    it('returns true when the range equals the highest', function () {
      assert.equal(satisfiesHighest('^1.5.0', '^1.5.0'), true);
    });

    it('returns null when highestVersion is null', function () {
      assert.equal(satisfiesHighest('^1.0.0', null), null);
    });

    it('returns null for an invalid range', function () {
      assert.equal(satisfiesHighest('not-a-version', '^1.0.0'), null);
    });
  });

  describe('gatherTransitiveDepsInfo', function () {
    const baseOpts = {
      deps: ['tracked-dep'],
      transitiveDeps: ['shared-lib'],
      ignoreDevDeps: false,
    };

    // Builds a stub resolveExternal that returns the given manifest.
    function resolverFor(manifest: Record<string, any>) {
      return async (_name: string, _range: string) => Promise.resolve(manifest);
    }

    it('finds a transitive dep used both directly and via a tracked dep', async function () {
      const packages = [
        {
          packageJson: {
            name: '@my-scope/pkg-a',
            dependencies: { 'shared-lib': '^1.0.0', 'tracked-dep': '^2.0.0' },
          },
        },
      ];

      const trackedDepManifest = {
        name: 'tracked-dep',
        dependencies: { 'shared-lib': '^1.5.0' },
      };

      const groups = await gatherTransitiveDepsInfo({
        ...baseOpts,
        packages,
        resolveExternal: resolverFor(trackedDepManifest),
      });

      const entries = groups.get('shared-lib');
      assert.ok(entries, 'shared-lib should be in the result');

      const versions = entries.map((e) => ({
        version: e.version,
        label: e.label,
      }));
      assert.deepStrictEqual(versions, [
        { version: '^1.0.0', label: '@my-scope/pkg-a' },
        { version: '^1.5.0', label: 'via tracked-dep@^2.0.0' },
      ]);
    });

    it('excludes devDependencies when ignoreDevDeps is true', async function () {
      const packages = [
        {
          packageJson: {
            name: 'pkg-a',
            devDependencies: {
              'shared-lib': '^1.0.0',
              'tracked-dep': '^2.0.0',
            },
          },
        },
      ];

      const trackedDepManifest = {
        name: 'tracked-dep',
        devDependencies: { 'shared-lib': '^1.5.0' },
      };

      const groups = await gatherTransitiveDepsInfo({
        ...baseOpts,
        ignoreDevDeps: true,
        packages,
        resolveExternal: resolverFor(trackedDepManifest),
      });

      assert.equal(groups.size, 0, 'dev deps should be ignored');
    });

    it('does not treat local monorepo packages as external tracked deps', async function () {
      const packages = [
        {
          packageJson: {
            name: 'tracked-dep', // this package IS in the monorepo
            dependencies: { 'shared-lib': '^1.0.0' },
          },
        },
        {
          packageJson: {
            name: 'pkg-a',
            dependencies: { 'tracked-dep': '^1.0.0' },
          },
        },
      ];

      let externalCallCount = 0;
      const groups = await gatherTransitiveDepsInfo({
        ...baseOpts,
        packages,
        resolveExternal: async () => {
          externalCallCount++;
          return Promise.resolve({});
        },
      });

      assert.equal(
        externalCallCount,
        0,
        'resolveExternal should not be called for local packages',
      );
      // shared-lib is a direct dep of tracked-dep (local), so it appears via the local scan
      const entries = groups.get('shared-lib');
      assert.ok(entries);
      assert.equal(entries[0].label, 'tracked-dep');
    });

    it('returns an empty map when nothing matches', async function () {
      const packages = [
        {
          packageJson: {
            name: 'pkg-a',
            dependencies: { 'unrelated-dep': '^1.0.0' },
          },
        },
      ];

      const groups = await gatherTransitiveDepsInfo({
        ...baseOpts,
        packages,
        resolveExternal: resolverFor({}),
      });

      assert.equal(groups.size, 0);
    });
  });

  describe('findMisalignments', function () {
    it('returns empty array when all versions are aligned', function () {
      const groups = new Map([
        [
          'shared-lib',
          [
            { version: '^1.0.0', label: 'pkg-a' },
            { version: '^1.0.0', label: 'pkg-b' },
          ],
        ],
      ]);
      assert.deepStrictEqual(findMisalignments(groups), []);
    });

    it('returns empty array when a dep has only one entry', function () {
      const groups = new Map([
        ['shared-lib', [{ version: '^1.0.0', label: 'pkg-a' }]],
      ]);
      assert.deepStrictEqual(findMisalignments(groups), []);
    });

    it('returns empty array for an empty map', function () {
      assert.deepStrictEqual(findMisalignments(new Map()), []);
    });

    it('reports a mismatch when versions differ', function () {
      const groups = new Map([
        [
          'shared-lib',
          [
            { version: '^1.0.0', label: 'pkg-a' },
            { version: '^2.0.0', label: 'via tracked-dep@^1.0.0' },
          ],
        ],
      ]);

      const result = findMisalignments(groups);
      assert.equal(result.length, 1);
      assert.equal(result[0].name, 'shared-lib');
      assert.equal(result[0].highestVersion, '^2.0.0');
      assert.equal(result[0].entries.length, 2);
    });

    it('marks entries that do not satisfy the highest range', function () {
      const groups = new Map([
        [
          'shared-lib',
          [
            { version: '^1.0.0', label: 'pkg-a' },
            { version: '^2.0.0', label: 'pkg-b' },
          ],
        ],
      ]);

      const entries = findMisalignments(groups)[0].entries;
      assert.equal(entries[0].satisfiesHighest, false);
      assert.equal(entries[1].satisfiesHighest, true);
    });

    it('marks entries that satisfy the highest range', function () {
      const groups = new Map([
        [
          'shared-lib',
          [
            { version: '^1.0.0', label: 'pkg-a' },
            { version: '^1.5.0', label: 'pkg-b' },
          ],
        ],
      ]);

      const entries = findMisalignments(groups)[0].entries;
      assert.equal(entries[0].satisfiesHighest, true);
      assert.equal(entries[1].satisfiesHighest, true);
    });

    it('returns results sorted by dep name', function () {
      const groups = new Map([
        [
          'zlib',
          [
            { version: '^1.0.0', label: 'a' },
            { version: '^2.0.0', label: 'b' },
          ],
        ],
        [
          'axios',
          [
            { version: '^0.21.0', label: 'a' },
            { version: '^1.0.0', label: 'b' },
          ],
        ],
      ]);

      const names = findMisalignments(groups).map((m) => m.name);
      assert.deepStrictEqual(names, ['axios', 'zlib']);
    });

    it('sets satisfiesHighest to null for invalid ranges', function () {
      const groups = new Map([
        [
          'shared-lib',
          [
            { version: 'not-valid', label: 'pkg-a' },
            { version: '^1.0.0', label: 'pkg-b' },
          ],
        ],
      ]);

      const entries = findMisalignments(groups)[0].entries;
      assert.equal(entries[0].satisfiesHighest, null);
    });
  });

  describe('getDepsFromPackageJson', function () {
    const packageJson = {
      dependencies: { foo: '^1.0.0', shared: '^2.0.0' },
      devDependencies: { bar: '^3.0.0', shared: '^2.1.0' },
      peerDependencies: { baz: '^4.0.0' },
    };

    it('collects deps from all groups by default', function () {
      const deps = getDepsFromPackageJson(packageJson);
      assert.equal(deps.get('foo'), '^1.0.0');
      assert.equal(deps.get('bar'), '^3.0.0');
      assert.equal(deps.get('baz'), '^4.0.0');
    });

    it('excludes devDependencies when ignoreDevDeps is true', function () {
      const deps = getDepsFromPackageJson(packageJson, { ignoreDevDeps: true });
      assert.equal(deps.get('foo'), '^1.0.0');
      assert.equal(deps.get('bar'), undefined);
      assert.equal(deps.get('baz'), '^4.0.0');
    });

    it('gives precedence to the first group when a name appears in multiple groups', function () {
      // 'shared' appears in both dependencies and devDependencies;
      // dependencies is iterated first so its version wins.
      const deps = getDepsFromPackageJson(packageJson);
      assert.equal(deps.get('shared'), '^2.0.0');
    });

    it('handles missing dependency groups gracefully', function () {
      const deps = getDepsFromPackageJson({ name: 'empty-pkg' });
      assert.equal(deps.size, 0);
    });
  });
});
