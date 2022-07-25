const semver = require('semver');

function maxIncrement(inc1, inc2) {
  if (inc1 && inc2) {
    return semver.gt(semver.inc('1.0.0', inc1), semver.inc('1.0.0', inc2))
      ? inc1
      : inc2;
  }

  // return the first defined or undefined in neither are set
  return inc1 || inc2;
}

module.exports = maxIncrement;
