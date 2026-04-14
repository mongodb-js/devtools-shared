import assert from 'assert';
import {
  matchesAnyPattern,
  satisfiesHighest,
  getDepsFromPackageJson,
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
