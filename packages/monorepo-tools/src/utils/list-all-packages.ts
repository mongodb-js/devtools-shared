import type { PackageInfo } from './get-packages-in-topological-order';
import { getPackagesInTopologicalOrder } from './get-packages-in-topological-order';
import { findMonorepoRoot } from './find-monorepo-root';

export async function* listAllPackages(): AsyncIterable<
  { rootDir: string; packageJson: Record<string, any> } & PackageInfo
> {
  const monorepoRoot = await findMonorepoRoot();
  const packages = await getPackagesInTopologicalOrder(monorepoRoot);
  for (const packageInfo of packages) {
    yield packageInfo;
  }
}
