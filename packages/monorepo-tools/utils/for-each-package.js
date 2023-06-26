const path = require('path');
const {
  getPackagesInTopologicalOrder,
} = require('./get-packages-in-topological-order');
const { findMonorepoRoot } = require('./find-monorepo-root');

async function forEachPackage(fn) {
  let interrupted = false;
  const interrupt = () => {
    interrupted = true;
  };
  const monorepoRoot = await findMonorepoRoot();
  const packages = await getPackagesInTopologicalOrder(monorepoRoot);
  const result = [];
  for (const packageInfo of packages) {
    const packageJson = require(path.join(
      packageInfo.location,
      'package.json'
    ));
    result.push(
      await fn(
        { rootDir: monorepoRoot, packageJson, ...packageInfo },
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
