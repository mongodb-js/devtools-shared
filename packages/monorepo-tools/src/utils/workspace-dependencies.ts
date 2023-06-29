import path from 'path';
import type { PackageInfo } from './get-packages-in-topological-order';
import { getPackagesInTopologicalOrder } from './get-packages-in-topological-order';
import { findMonorepoRoot } from './find-monorepo-root';

export type DepType = 'prod' | 'dev' | 'optional' | 'peer';

export async function collectWorkspacesMeta() {
  const monorepoRoot = await findMonorepoRoot();
  const workspaces: Pick<PackageInfo, 'location'>[] =
    await getPackagesInTopologicalOrder(monorepoRoot);

  return new Map(
    workspaces
      .concat({ location: monorepoRoot })
      .map(({ location }) => [
        location,
        { ...require(path.join(location, 'package.json')), location },
      ])
  );
}

function getDepType(
  dependency: string,
  version: string,
  pkgJson: Record<string, any>
): DepType | null {
  return pkgJson.devDependencies &&
    pkgJson.devDependencies[dependency] === version
    ? 'dev'
    : pkgJson.peerDependencies &&
      pkgJson.peerDependencies[dependency] === version
    ? 'peer'
    : pkgJson.optionalDependencies &&
      pkgJson.optionalDependencies[dependency] === version
    ? 'optional'
    : pkgJson.dependencies && pkgJson.dependencies[dependency] === version
    ? 'prod'
    : null;
}

export type WorkspaceDependencyInfo = {
  version: string;
  from: string;
  workspace: string;
  type: DepType;
};
export function collectWorkspacesDependencies(
  workspaces: Map<
    string,
    {
      dependencies?: any;
      devDependencies?: any;
      peerDependencies?: any;
      optionalDependencies?: any;
      name: string;
    }
  >
) {
  const dependencies = new Map<string, WorkspaceDependencyInfo[]>();

  for (const [location, pkgJson] of workspaces) {
    for (const [dependency, versionRange] of [
      ...Object.entries(pkgJson.dependencies || {}),
      ...Object.entries(pkgJson.devDependencies || {}),
      ...filterOutStarDeps(Object.entries(pkgJson.peerDependencies || {})),
      ...filterOutStarDeps(Object.entries(pkgJson.optionalDependencies || {})),
    ]) {
      const item = {
        version: versionRange as string,
        workspace: pkgJson.name,
        from: location,
        type: getDepType(dependency, versionRange as string, pkgJson)!,
      };

      if (dependencies.has(dependency)) {
        dependencies.get(dependency)!.push(item);
      } else {
        dependencies.set(dependency, [item]);
      }
    }
  }

  return dependencies;
}

function filterOutStarDeps(entries: [string, string][]) {
  return entries.filter(([, v]) => v !== '*');
}
