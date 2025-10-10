import { listAllPackages } from './list-all-packages';

export interface NpmTokenRequirements {
  scopes: string[];
  packages: string[];
}

/**
 * Gets all package names and scopes from the current monorepo.
 * Returns scoped packages as scopes and unscoped packages as individual packages.
 */
export async function getNpmTokenList(): Promise<NpmTokenRequirements> {
  const allPackagesArr = [];
  for await (const { packageJson } of listAllPackages()) {
    // listAllPackages yields { name: string, ... }
    if (packageJson && typeof packageJson?.name === 'string') {
      allPackagesArr.push(packageJson.name);
    }
  }

  // Separate scoped and unscoped packages
  const scopedPackages = allPackagesArr.filter(
    (pkg) => typeof pkg === 'string' && pkg.startsWith('@'),
  );
  const unscopedPackages = allPackagesArr.filter(
    (pkg) => typeof pkg === 'string' && !pkg.startsWith('@'),
  );

  // Extract unique scopes from scoped packages
  const scopes = [
    ...new Set(
      scopedPackages.map((pkg) => {
        const scope = pkg.split('/')[0];
        return `${scope}/*`;
      }),
    ),
  ].sort();

  // Sort unscoped packages
  const packages = [...new Set(unscopedPackages)].sort();

  return { scopes, packages };
}
