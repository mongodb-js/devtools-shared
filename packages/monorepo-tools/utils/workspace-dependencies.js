const path = require('path');
const { MONOREPO_ROOT } = require('./constants');
const {
  getPackagesInTopologicalOrder,
} = require('./get-packages-in-topological-order');

async function collectWorkspacesMeta() {
  const workspaces = await getPackagesInTopologicalOrder(MONOREPO_ROOT);

  return new Map(
    workspaces
      .concat({ location: MONOREPO_ROOT })
      .map(({ location }) => [
        location,
        { ...require(path.join(location, 'package.json')), location },
      ])
  );
}

const DepTypes = {
  Prod: 'prod',
  Dev: 'dev',
  Optional: 'optional',
  Peer: 'peer',
};

function getDepType(dependency, version, pkgJson) {
  return pkgJson.devDependencies &&
    pkgJson.devDependencies[dependency] === version
    ? DepTypes.Dev
    : pkgJson.peerDependencies &&
      pkgJson.peerDependencies[dependency] === version
    ? DepTypes.Peer
    : pkgJson.optionalDependencies &&
      pkgJson.optionalDependencies[dependency] === version
    ? DepTypes.Optional
    : pkgJson.dependencies && pkgJson.dependencies[dependency] === version
    ? DepTypes.Prod
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
  DepTypes,
  collectWorkspacesMeta,
  collectWorkspacesDependencies,
};
