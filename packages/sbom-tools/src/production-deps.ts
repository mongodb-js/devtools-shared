import path from 'path';
import findUp from 'find-up';
import fs from 'fs';

function resolvePackage(packageName: string) {
  const resolved = require.resolve(packageName);
  // this is the case of native packages that are also distributed as
  // npm packages for webpack (for example "buffer")
  if (resolved === packageName) {
    return require.resolve(packageName + '/');
  }

  return resolved;
}

export function findPackageLocation(packageName: string) {
  const packageJsonPath = findUp.sync('package.json', {
    cwd: resolvePackage(packageName),
    allowSymlinks: false,
  });

  if (!packageJsonPath) {
    throw new Error(`Failed to find package.json for ${packageName}`);
  }

  return path.dirname(packageJsonPath);
}

function getProductionDeps(packageLocation: string) {
  const packageJsonPath = path.join(packageLocation, 'package.json');
  let dependencies = {};
  try {
    const packageJsonContents = fs.readFileSync(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonContents);
    dependencies = packageJson.dependencies || {};
  } catch (err) {
    console.error(`Failed to read package.json in ${packageLocation}`);
  }
  return Object.keys(dependencies);
}

export function findAllProdDepsTreeLocations(): string[] {
  const rootPackageJsonPath = findUp.sync('package.json');
  if (!rootPackageJsonPath) {
    throw new Error('cannot find root package.json');
  }

  const root = path.dirname(rootPackageJsonPath);
  const allLocations = new Set<string>();
  const visited = new Set();
  const queue = [root];

  while (queue.length > 0) {
    const packageLocation = queue.shift();
    if (!packageLocation) {
      continue;
    }

    if (visited.has(packageLocation)) {
      continue;
    }
    visited.add(packageLocation);

    const productionDeps = getProductionDeps(packageLocation);
    productionDeps.forEach((dep) => {
      try {
        const depLocation = findPackageLocation(dep);
        if (depLocation) {
          allLocations.add(depLocation);
          queue.push(depLocation);
        }
      } catch (error) {
        console.error(
          `Error adding ${dep} from ${packageLocation}: ${
            (error as Error).message
          }`
        );
      }
    });
  }

  return Array.from(allLocations);
}
