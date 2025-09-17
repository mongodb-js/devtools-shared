var types = ['Command', 'Special', 'System', 'Oplog', 'Normal', 'Conf'];

// eslint-disable-next-line complexity
function NS(ns) {
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
    this.oplog || this.command || this.system || this.database === 'config' || /^__mdb_internal_\w/.test(this.database);

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
    (this.oplog || /^[^\0\$]*$/.test(this.collection));

  this.databaseHash = 7;
  this.ns.split('').every(
    function(c, i) {
      if (c === '.') {
        return false;
      }
      this.databaseHash += 11 * this.ns.charCodeAt(i);
      this.databaseHash *= 3;
      return true;
    }.bind(this)
  );
}

NS.prototype.database = '';
NS.prototype.databaseHash = 0;
NS.prototype.collection = '';

NS.prototype.command = false;
NS.prototype.special = false;
NS.prototype.system = false;
NS.prototype.oplog = false;
NS.prototype.normal = false;
NS.prototype.specialish = false;

types.forEach(function(type) {
  NS.prototype['is' + type] = function() {
    return this[type.toLowerCase()];
  };
});

NS.prototype.toString = function() {
  return this.ns;
};

NS.MAX_DATABASE_NAME_LENGTH = 128;

module.exports = NS;

var ns = NS;
module.exports.sort = function(namespaces) {
  namespaces.sort(function(a, b) {
    if (ns(a).specialish && ns(b).specialish) {
      return 0;
    }
    if (ns(a).specialish && !ns(b).specialish) {
      return 1;
    }
    if (!ns(a).specialish && ns(b).specialish) {
      return -1;
    }
    return a > b ? 1 : -1;
  });
  return namespaces;
};
