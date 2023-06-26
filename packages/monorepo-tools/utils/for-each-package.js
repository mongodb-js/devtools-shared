const path = require('path');
const { MONOREPO_ROOT } = require('./constants');
const {
  getPackagesInTopologicalOrder,
} = require('./get-packages-in-topological-order');

async function forEachPackage(fn) {
  let interrupted = false;
  const interrupt = () => {
    interrupted = true;
  };
  const packages = await getPackagesInTopologicalOrder(MONOREPO_ROOT);
  const result = [];
  for (const packageInfo of packages) {
    const packageJson = require(path.join(
      packageInfo.location,
      'package.json'
    ));
    result.push(
      await fn(
        { rootDir: MONOREPO_ROOT, packageJson, ...packageInfo },
        interrupt
      )
    );
    if (interrupted) {
      break;
    }
  }
  return result;
}

exports.forEachPackage = forEachPackage;
