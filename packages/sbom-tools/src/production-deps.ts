/* eslint-disable no-console */
import path from 'path';
import findUp from 'find-up';
import fs from 'fs';

function resolvePackage(packageName: string, from: string) {
  const resolved = require.resolve(packageName, { paths: [from] });
  // this is the case of native packages that are also distributed as
  // npm packages for webpack (for example "buffer")
  if (resolved === packageName) {
    return require.resolve(packageName + '/', { paths: [from] });
  }

  return resolved;
}

export function findPackageLocation(packageName: string, from: string): string {
  const packageJsonPath = findUp.sync('package.json', {
    cwd: resolvePackage(packageName, from),
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
  let optionalDependencies = {};
  try {
    const packageJsonContents = fs.readFileSync(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonContents);
    dependencies = packageJson.dependencies || {};
    optionalDependencies = packageJson.optionalDependencies || {};
  } catch (err) {
    console.error(`Failed to read package.json in ${packageLocation}`);
  }
  return { dependencies, optionalDependencies };
}

export function findAllProdDepsTreeLocations(from = process.cwd()): string[] {
  const rootPackageJsonPath = findUp.sync('package.json', { cwd: from });
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

    const { dependencies, optionalDependencies } =
      getProductionDeps(packageLocation);
    [
      ...Object.keys(dependencies),
      ...Object.keys(optionalDependencies),
    ].forEach((dep) => {
      try {
        const depLocation = findPackageLocation(dep, from);

        if (depLocation) {
          allLocations.add(depLocation);
          queue.push(depLocation);
        }
      } catch (error) {
        console.error(
          `Warning: failed to resolve ${dep} from ${packageLocation}. This is normal if this dependency is optional. ${
            (error as Error).message
          }`
        );
      }
    });
  }

  return Array.from(allLocations);
}
