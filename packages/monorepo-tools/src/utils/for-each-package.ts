import path from 'path';
import { getPackagesInTopologicalOrder } from './get-packages-in-topological-order';
import { findMonorepoRoot } from './find-monorepo-root';

export async function forEachPackage(fn) {
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
