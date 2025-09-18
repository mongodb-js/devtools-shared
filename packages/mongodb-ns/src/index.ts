type NS = {
  ns: string;
  dotIndex: number;
  database: string;
  collection: string;
  system: boolean;
  isSystem(): boolean;
  oplog: boolean;
  isOplog(): boolean;
  command: boolean;
  isCommand(): boolean;
  special: boolean;
  isSpecial(): boolean;
  specialish: boolean;
  normal: boolean;
  isNormal(): boolean;
  validDatabaseName: boolean;
  validCollectionName: boolean;
  databaseHash: number;
  toString(): string;
  // Assigned in the constructor, but will always be undefined
  isConf(): undefined;
};

type NSConstructor = {
  (ns: string | NS): NS;
  new (ns: string | NS): NS;
  prototype: NS;
  MAX_DATABASE_NAME_LENGTH: number;
  sort(namespaces: (string | NS)[]): typeof namespaces;
};

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

  this.system = /^(?:system(?!\.profile$).*|enxcol_)\./.test(this.collection);

  this.oplog = /local\.oplog\.(\$main|rs)/.test(ns);

  this.command =
    this.collection === '$cmd' || this.collection.indexOf('$cmd.sys') === 0;
  this.special =
    this.oplog ||
    this.command ||
    this.system ||
    this.database === 'config' ||
    /^__mdb_internal_\w/.test(this.database);

  this.specialish =
    this.special || ['local', 'admin'].indexOf(this.database) > -1;

  this.normal = this.oplog || this.ns.indexOf('$') === -1;

  /**
   * @note (imlucas) The following are not valid on windows:
   * `*<>:|?`
   */
  this.validDatabaseName =
    new RegExp('^[^\\\\/". ]*$').test(this.database) &&
    this.database.length <= NS.MAX_DATABASE_NAME_LENGTH;
  this.validCollectionName =
    this.collection.length > 0 &&
    (this.oplog || /^[^\0$]*$/.test(this.collection));

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
