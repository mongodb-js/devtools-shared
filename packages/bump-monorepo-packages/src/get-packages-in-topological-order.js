const { promises: fs } = require('fs');
const path = require('path');
const { glob } = require('glob');
const toposort = require('toposort');

module.exports = async function getPackagesInTopologicalOrder(cwd) {
  const patterns =
    JSON.parse(await fs.readFile(path.join(cwd, `package.json`), 'utf8'))
      .workspaces || [];

  const packageJsonPaths = await glob(
    patterns.map((pattern) => path.join(pattern, 'package.json'))
  );

  const internalPackages = await Promise.all(
    packageJsonPaths.map(async (packageJsonPath) => {
      const packageJson = JSON.parse(
        await fs.readFile(packageJsonPath, 'utf8')
      );
      return {
        name: packageJson.name,
        location: packageJsonPath,
        packageJson,
      };
    })
  );

  const edges = [];
  const packageNames = new Set(internalPackages.map((p) => p.name));

  for (const internalPackage of internalPackages) {
    const anyInternalDependency = Object.keys({
      ...(internalPackage.packageJson?.dependencies || {}),
      ...(internalPackage.packageJson?.devDependencies || {}),
      ...(internalPackage.packageJson?.optionalDependencies || {}),
      ...(internalPackage.packageJson?.peerDependencies || {}),
    }).filter((dep) => packageNames.has(dep));

    edges.push(['.root', internalPackage.name]);

    if (anyInternalDependency.length) {
      for (const dep of anyInternalDependency) {
        edges.push([internalPackage.name, dep]);
      }
    }
  }

  const sorted = toposort(edges).slice(1).reverse();

  const result = sorted
    .map((packageName) => internalPackages.find((p) => p.name === packageName))
    .map((packageInfo) => {
      return {
        name: packageInfo.name,
        version: packageInfo.packageJson.version,
        private: !!packageInfo.packageJson.private,
        location: path.resolve(path.dirname(packageInfo.location)),
      };
    });

  return result;
};
