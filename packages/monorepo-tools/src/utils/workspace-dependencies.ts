import path from 'path';
import { getPackagesInTopologicalOrder } from './get-packages-in-topological-order';
import { findMonorepoRoot } from './find-monorepo-root';

async function collectWorkspacesMeta() {
  const monorepoRoot = await findMonorepoRoot();
  const workspaces = await getPackagesInTopologicalOrder(monorepoRoot);

  return new Map(
    workspaces
      .concat({ location: monorepoRoot })
      .map(({ location }) => [
        location,
        { ...require(path.join(location, 'package.json')), location },
      ])
  );
}

function getDepType(dependency, version, pkgJson) {
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

/**
 *
 * @param {Map<string, { dependencies?: any, devDependencies?: any, peerDependencies?: any, optionalDependencies?: any }>} workspaces
 * @returns {Map<string, { version: string, from: string, workspace: string, type: 'prod' | 'dev' | 'optional' | 'peer' }[]>}
 */
function collectWorkspacesDependencies(workspaces) {
  const dependencies = new Map();

  for (const [location, pkgJson] of workspaces) {
    for (const [dependency, versionRange] of [
      ...Object.entries(pkgJson.dependencies || {}),
      ...Object.entries(pkgJson.devDependencies || {}),
      ...filterOutStarDeps(Object.entries(pkgJson.peerDependencies || {})),
      ...filterOutStarDeps(Object.entries(pkgJson.optionalDependencies || {})),
    ]) {
      const item = {
        version: versionRange,
        workspace: pkgJson.name,
        from: location,
        type: getDepType(dependency, versionRange, pkgJson),
      };

      if (dependencies.has(dependency)) {
        dependencies.get(dependency).push(item);
      } else {
        dependencies.set(dependency, [item]);
      }
    }
  }

  return dependencies;
}

function filterOutStarDeps(entries) {
  return entries.filter(([, v]) => v !== '*');
}

module.exports = {
  collectWorkspacesMeta,
  collectWorkspacesDependencies,
};
