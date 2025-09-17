var assert = require('assert');
var ns = require('..');

describe('ns', function() {
  describe('normal', function() {
    it('should acccept `a`', function() {
      assert(ns('a').normal);
    });
    it('should acccept `a.b`', function() {
      assert(ns('a.b').normal);
    });
    it('should acccept `a.b.c`', function() {
      assert(ns('a.b.c').normal);
    });
    it('should acccept `local.oplog.$main`', function() {
      assert(ns('local.oplog.$main').normal);
    });
    it('should acccept `local.oplog.rs`', function() {
      assert(ns('local.oplog.rs').normal);
    });
    it('should not acccept `a.b.$c`', function() {
      assert.equal(ns('a.b.$c').normal, false);
    });
    it('should not acccept `a.b.$.c`', function() {
      assert.equal(ns('a.b.$.c').normal, false);
    });
  });

  it('should identify oplog namespaces', function() {
    assert.equal(ns('a').oplog, false);
    assert.equal(ns('a.b').oplog, false);
    assert(ns('local.oplog.rs').oplog);
    assert.equal(ns('local.oplog.foo').oplog, false);
    assert(ns('local.oplog.$main').oplog);
    assert.equal(ns('local.oplog.$foo').oplog, false);
  });

  describe('should identify special namespaces', function() {
    it('should NOT accept `a.$.b as special`', function() {
      assert.equal(ns('a.$.b').special, false);
    });
    it('should acccept `a.system.foo`', function() {
      assert(ns('a.system.foo').special);
    });
    it('should acccept `a.enxcol_.foo`', function() {
      assert(ns('a.enxcol_.foo').special);
    });
    it('should not accept `a.foo`', function() {
      assert.equal(ns('a.foo').special, false);
    });
    it('should not accept `a.systemfoo`', function() {
      assert.equal(ns('a.systemfoo').special, false);
    });
    it('should not accept `a.foo.system.bar`', function() {
      assert.equal(ns('a.foo.system.bar').special, false);
    });
    it('should not accept `prefix__mdb_internal_suffix`', function() {
      assert.equal(ns('prefix__mdb_internal_suffix').special, false);
    });
    it('should not accept `anyDB.prefix__mdb_internal_suffix`', function() {
      assert.equal(ns('anyDB.prefix__mdb_internal_itsACollectionNow').special, false);
    });
    it('should not accept `prefix__mdb_internal_suffix`', function() {
      assert.equal(ns('prefix__mdb_internal_').special, false);
    });
    it('should acccept `__mdb_internal_suffix`', function() {
      assert(ns('__mdb_internal_suffix').special);
    });
  });

  describe('should identify system namespaces', function() {
    it('should acccept `anyDB.enxcol_.` as system`', function() {
      assert(ns('anyDB.enxcol_.').system);
    });
    it('should acccept `anyDB.system.` as system`', function() {
      assert(ns('anyDB.system.').system);
    });
    it('should acccept `anyDB.system.anyCollSuffix` as system`', function() {
      assert(ns('anyDB.system.anyCollSuffix').system);
    });
    it('should NOT acccept `anyDB.anyCollPrefix.system` as system`', function() {
      assert.equal((ns('anyDB.anyCollPrefix.system').system), false);
    });
    it('should NOT acccept `anyDB.system` as system`', function() {
      assert.equal((ns('anyDB.system').system), false);
    });
    // exception for system.profile COMPASS-9377
    it('should NOT acccept `anyDB.system.profile as system`', function() {
      assert.equal((ns('anyDB.system.profile').system), false);
    });
    it('should acccept `anyDB.system.profile_anything as system`', function() {
      assert(ns('anyDB.system.profile_anything').system);
    });
  });

  describe('database name validation', function() {
    it('should accept `foo` as a valid database name', function() {
      assert.equal(ns('foo').validDatabaseName, true);
    });
    it('should not accept `foo/bar` as a valid database name', function() {
      assert.equal(ns('foo/bar').validDatabaseName, false);
    });
    it('should not accept `foo bar` as a valid database name', function() {
      assert.equal(ns('foo bar').validDatabaseName, false);
    });
    it('should not accept `foo\\bar` as a valid database name', function() {
      assert.equal(ns('foo\\bar').validDatabaseName, false);
    });
    it('should not accept `foo\"bar` as a valid database name', function() {
      assert.equal(ns('foo\"bar').validDatabaseName, false);
    });
    it.skip('should not accept `foo*bar` as a valid database name', function() {
      assert.equal(ns('foo*bar').validDatabaseName, false);
    });
    it.skip('should not accept `foo<bar` as a valid database name', function() {
      assert.equal(ns('foo<bar').validDatabaseName, false);
    });
    it.skip('should not accept `foo>bar` as a valid database name', function() {
      assert.equal(ns('foo>bar').validDatabaseName, false);
    });
    it.skip('should not accept `foo:bar` as a valid database name', function() {
      assert.equal(ns('foo:bar').validDatabaseName, false);
    });
    it.skip('should not accept `foo|bar` as a valid database name', function() {
      assert.equal(ns('foo|bar').validDatabaseName, false);
    });
    it.skip('should not accept `foo?bar` as a valid database name', function() {
      assert.equal(ns('foo?bar').validDatabaseName, false);
    });
  });

  describe('collection name validation', function() {
    it('should accept `a.b` as valid', function() {
      assert.equal(ns('a.b').validCollectionName, true);
    });
    it('should accept `a.b` as valid', function() {
      assert.equal(ns('a.b').validCollectionName, true);
    });
    it('should accept `a.b.` as valid', function() {
      assert.equal(ns('a.b.').validCollectionName, true);
    });
    it('should accept `a.b` as valid', function() {
      assert.equal(ns('a.b').validCollectionName, true);
    });
    it('should accept `a.b.` as valid', function() {
      assert.equal(ns('a.b.').validCollectionName, true);
    });
    it('should accept `a$b` as valid', function() {
      assert.equal(ns('a$b').validCollectionName, false);
    });

    it('should not accept `a.` as valid', function() {
      assert.equal(ns('a.').validCollectionName, false);
    });

    it('should not accept `$a` as valid', function() {
      assert.equal(ns('$a').validCollectionName, false);
    });

    it('should not accept `` as valid', function() {
      assert.equal(ns('').validCollectionName, false);
    });
  });

  describe('database hash', function() {
    it('should have the same value for `foo` and `foo`', function() {
      assert.equal(ns('foo').databaseHash, ns('foo').databaseHash);
    });
    it('should have the same value for `foo` and `foo.a`', function() {
      assert.equal(ns('foo').databaseHash, ns('foo.a').databaseHash);
    });
    it('should have the same value for `foo` and `foo.`', function() {
      assert.equal(ns('foo').databaseHash, ns('foo.').databaseHash);
    });
    it('should have the same value for `` and ``', function() {
      assert.equal(ns('').databaseHash, ns('').databaseHash);
    });
    it('should have the same value for `` and `.a`', function() {
      assert.equal(ns('').databaseHash, ns('.a').databaseHash);
    });
    it('should have the same value for `` and `.`', function() {
      assert.equal(ns('').databaseHash, ns('.').databaseHash);
    });
    it('should not have the same value for `foo` and `food`', function() {
      assert.notEqual(ns('foo').databaseHash, ns('food').databaseHash);
    });
    it('should not have the same value for `foo.` and `food`', function() {
      assert.notEqual(ns('foo.').databaseHash, ns('food').databaseHash);
    });
    it('should not have the same value for `foo.d` and `food`', function() {
      assert.notEqual(ns('foo.d').databaseHash, ns('food').databaseHash);
    });
  });

  it('should extract database names', function() {
    assert.equal(ns('foo').database, ns('foo').database);
    assert.equal(ns('foo').database, ns('foo.a').database);
    assert.equal(ns('foo.a').database, ns('foo.a').database);
    assert.equal(ns('foo.a').database, ns('foo.b').database);

    assert.equal(ns('').database, ns('').database);
    assert.equal(ns('').database, ns('.').database);
    assert.equal(ns('').database, ns('.x').database);

    assert.notEqual(ns('foo').database, ns('bar').database);
    assert.notEqual(ns('foo').database, ns('food').database);
    assert.notEqual(ns('foo.').database, ns('food').database);

    assert.notEqual(ns('').database, ns('x').database);
    assert.notEqual(ns('').database, ns('x.').database);
    assert.notEqual(ns('').database, ns('x.y').database);
    assert.notEqual(ns('.').database, ns('x').database);
    assert.notEqual(ns('.').database, ns('x.').database);
    assert.notEqual(ns('.').database, ns('x.y').database);

    assert.equal('foo', ns('foo.bar').database);
    assert.equal('foo', ns('foo').database);
    assert.equal('foo', ns('foo.bar').database);
    assert.equal('foo', ns('foo').database);

    assert.equal(ns('a.b').database, 'a');
    assert.equal(ns('a.b').collection, 'b');

    assert.equal(ns('a.b').database, 'a');
    assert.equal(ns('a.b.c').collection, 'b.c');

    assert.equal(ns('abc.').collection, '');
    assert.equal(ns('abc.').database, 'abc');
  });

  describe('sorting', function() {
    it('should sort them', function() {
      var names = ['admin', 'canadian-things', 'github', 'local', 'scope_stat', 'statsd', 'test'];
      var expect = ['canadian-things', 'github', 'scope_stat', 'statsd', 'test', 'admin', 'local'];
      ns.sort(names);
      assert.deepEqual(names, expect);
    });
  });
});
