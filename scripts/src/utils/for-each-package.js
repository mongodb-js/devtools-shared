const path = require('path');
const { MONOREPO_ROOT: ROOT, LERNA_BIN } = require('./constants');
const { runInDir } = require('./run-in-dir');

async function forEachPackage(fn) {
  let interrupted = false;
  const interrupt = () => {
    interrupted = true;
  };
  const packages = JSON.parse(
    (await runInDir(`${LERNA_BIN} list --all --json --toposort`)).stdout
  );
  const result = [];
  for (const packageInfo of packages) {
    const packageJson = require(path.join(
      packageInfo.location,
      'package.json'
    ));
    result.push(
      await fn({ rootDir: ROOT, packageJson, ...packageInfo }, interrupt)
    );
    if (interrupted) {
      break;
    }
  }
  return result;
}

module.exports = { forEachPackage };
