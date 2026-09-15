/**
 * A MongoDB namespace (the `database.collection` string) and the
 * classification flags derived from it.
 */
type NS = {
  /**
   * The full namespace string, e.g. `'mydb.mycollection'`.
   */
  ns: string;
  /**
   * Index of the first `.` in `ns`, or `-1` when there is no dot.
   */
  dotIndex: number;
  /**
   * Everything before the first `.` in `ns`
   * or the whole string when there is no dot.
   */
  database: string;
  /**
   * Everything after the first `.` in `ns`, or `''` when there is no dot.
   */
  collection: string;
  /**
   * @see isSystem
   */
  system: boolean;
  /**
   * Whether this is a system-generated collection: the collection name is a
   * `system.*` collection (anything beginning with `system.` except
   * `system.profile` itself) or an `enxcol_.` queryable-encryption
   * collection.
   */
  isSystem(): boolean;
  /**
   * @see isOplog
   */
  oplog: boolean;
  /**
   * Whether the namespace is one of the two oplog namespaces,
   * `local.oplog.$main` or `local.oplog.rs`.
   */
  isOplog(): boolean;
  /**
   * @see isCommand
   */
  command: boolean;
  /**
   * Whether the collection is the command collection `$cmd` or begins with
   * `$cmd.sys`.
   */
  isCommand(): boolean;
  /**
   * @see isSpecial
   */
  special: boolean;
  /**
   * Whether the namespace is not an ordinary database/collection pair: set
   * when any of `oplog`, `command`, `system`, `internal` is true or the
   * database is `config`.
   */
  isSpecial(): boolean;
  /**
   * One level looser than `special`: true when `special` is true, or the
   * database is `local` or `admin`. `NS.sort` uses it to keep these
   * namespaces at the end of a sorted list.
   */
  specialish: boolean;
  /**
   * @see isNormal
   */
  normal: boolean;
  /**
   * Whether the namespace is an oplog, or when `ns` contains no `$` character
   * at all. (Despite the name, this includes the oplog.)
   */
  isNormal(): boolean;
  /**
   * @see isInternal
   */
  internal: boolean;
  /**
   * Whether the database is an internal database - its name matches
   * `/^__mdb_internal_\w/`. See the MongoDB Atlas "internal databases" docs.
   *
   * @see https://www.mongodb.com/docs/atlas/reference/internal-database/#internal-databases
   */
  isInternal(): boolean;
  /**
   * True when the database is a valid database name, i.e. it contains no
   * backslash, `/`, `"`, `.` or space, and is at most
   * `NS.MAX_DATABASE_NAME_LENGTH` (128) characters long.
   */
  validDatabaseName: boolean;
  /**
   * True when the collection name is non-empty and either the namespace is an
   * oplog or the name contains no NUL byte and no `$`.
   */
  validCollectionName: boolean;
  /**
   * @deprecated An approximate equivalent to Java's hashCode that does not work for db names longer than 30 characters.
   *
   * Hash of the database portion of `ns`, computed in the constructor from
   * the characters up to (and excluding) the first `.`.
   */
  databaseHash: number;
  /** The namespace string itself (`ns`). */
  toString(): string;
  /** Always `undefined` - reserved, never implemented. */
  isConf(): undefined;
};

type NSConstructor = {
  (ns: string | NS): NS;
  new (ns: string | NS): NS;
  prototype: NS;
  MAX_DATABASE_NAME_LENGTH: number;
  sort(namespaces: (string | NS)[]): typeof namespaces;
};

const INTERNAL_DATABASE_REGEXP = /^__mdb_internal_\w/;
const SYSTEM_COLLECTION_REGEXP = /^(?:system(?!\.profile$).*|enxcol_)\./;
const OPLOG_REGEXP = /local\.oplog\.(\$main|rs)/;
const VALID_DATABASE_NAME_REGEXP = /^[^\\/". ]*$/;
const VALID_COLLECTION_NAME_REGEXP = /^[^\0$]*$/;

// eslint-disable-next-line complexity
const NS: NSConstructor = function (this: NS, ns: string | NS): NS {
  ns = ns.toString();
  if (!(this instanceof NS)) {
    return new NS(ns);
  }

  this.ns = ns;
  this.dotIndex = ns.indexOf('.');
  if (this.dotIndex === -1) {
    this.database = ns;
    this.collection = '';
  } else {
    this.database = ns.slice(0, this.dotIndex);
    this.collection = ns.slice(this.dotIndex + 1);
  }

  this.internal = INTERNAL_DATABASE_REGEXP.test(this.database);

  this.system = SYSTEM_COLLECTION_REGEXP.test(this.collection);

  this.oplog = OPLOG_REGEXP.test(ns);

  this.command =
    this.collection === '$cmd' || this.collection.indexOf('$cmd.sys') === 0;
  this.special =
    this.oplog ||
    this.command ||
    this.system ||
    this.database === 'config' ||
    this.internal;

  this.specialish =
    this.special || this.database === 'local' || this.database === 'admin';

  this.normal = this.oplog || this.ns.indexOf('$') === -1;

  /**
   * @note (imlucas) The following are not valid on windows:
   * `*<>:|?`
   */
  this.validDatabaseName =
    VALID_DATABASE_NAME_REGEXP.test(this.database) &&
    this.database.length <= NS.MAX_DATABASE_NAME_LENGTH;
  this.validCollectionName =
    this.collection.length > 0 &&
    (this.oplog || VALID_COLLECTION_NAME_REGEXP.test(this.collection));

  this.databaseHash = 7;
  this.ns.split('').every((c, i) => {
    if (c === '.') {
      return false;
    }
    this.databaseHash += 11 * this.ns.charCodeAt(i);
    this.databaseHash *= 3;
    return true;
  });
  return this;
} as unknown as NSConstructor;

NS.prototype.database = '';
NS.prototype.databaseHash = 0;
NS.prototype.collection = '';

NS.prototype.command = false;
NS.prototype.special = false;
NS.prototype.system = false;
NS.prototype.oplog = false;
NS.prototype.normal = false;
NS.prototype.specialish = false;
NS.prototype.internal = false;

NS.prototype.isCommand = function () {
  return this.command;
};
NS.prototype.isSpecial = function () {
  return this.special;
};
NS.prototype.isSystem = function () {
  return this.system;
};
NS.prototype.isNormal = function () {
  return this.normal;
};
NS.prototype.isOplog = function () {
  return this.oplog;
};
NS.prototype.isInternal = function () {
  return this.internal;
};
NS.prototype.isConf = function () {
  return undefined;
};

NS.prototype.toString = function () {
  return this.ns;
};

NS.MAX_DATABASE_NAME_LENGTH = 128;

NS.sort = function (namespaces: (NS | string)[]) {
  namespaces.sort(function (a, b) {
    if (new NS(a).specialish && new NS(b).specialish) {
      return 0;
    }
    if (new NS(a).specialish && !new NS(b).specialish) {
      return 1;
    }
    if (!new NS(a).specialish && new NS(b).specialish) {
      return -1;
    }
    return a > b ? 1 : -1;
  });
  return namespaces;
};

export = NS;
