const { promises: fs } = require('fs');
const path = require('path');
const { glob } = require('glob');
const toposort = require('toposort');

module.exports = async function getPackagesInTopologicalOrder(cwd) {
  const patterns =
    JSON.parse(await fs.readFile(path.join(cwd, `package.json`))).workspaces ||
    [];

  const packageJsonPaths = await glob(
    patterns.map((pattern) => path.join(pattern, 'package.json'))
  );

  const packages = await Promise.all(
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
  const packageNames = new Set(packages.map((p) => p.name));

  for (const p of packages) {
    const anyDependency = Object.keys({
      ...(p.packageJson?.dependencies || {}),
      ...(p.packageJson?.devDependencies || {}),
      ...(p.packageJson?.optionalDependencies || {}),
      ...(p.packageJson?.peerDependencies || {}),
    }).filter((dep) => packageNames.has(dep));

    edges.push(['.root', p.name]);

    if (anyDependency.length) {
      for (const dep of anyDependency) {
        edges.push([p.name, dep]);
      }
    }
  }

  const sorted = toposort(edges).slice(1).reverse();

  const result = sorted
    .map((packageName) => packages.find((p) => p.name === packageName))
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
