import crypto from 'crypto';
import spdxSatisfies from 'spdx-satisfies';
import findUp from 'find-up';
import { promises as fs } from 'fs';

import type { Package } from '../get-package-info';
import { loadDependencyFiles } from '../load-dependency-files';
import crossSpawn from 'cross-spawn';

type Config = {
  ignoredOrgs?: string[];
  ignoredPackages?: string[];
  licenseOverrides?: Record<string, string>;
};

type PackageLockJsonDependency = {
  version: string;
  dependencies?: Record<string, PackageLockJsonDependency>;
};

type PackageLockJson = {
  lockfileVersion: 2;
  packages?: Record<
    string,
    { name: string; version: string; workspaces?: string[] }
  >;
  dependencies: Record<string, PackageLockJsonDependency>;
};

const ALLOWED_LICENSES = [
  'MIT',
  '0BSD',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'BSD-4-Clause',
  'Apache-2.0',
  'ISC',
  'CC-BY-4.0',
  'WTFPL',
  'OFL-1.1',
  'Unlicense',
];

function checkOverrides(
  packagesToCheck: string[],
  packageLockJson: PackageLockJson
) {
  const allDepsInLock = new Set();
  const traverseDependencies = (
    dependencies: PackageLockJson['dependencies']
  ) => {
    for (const packageName in dependencies) {
      const packageInfo = dependencies[packageName];
      allDepsInLock.add(`${packageName}@${packageInfo.version}`);

      if (packageInfo.dependencies) {
        traverseDependencies(packageInfo.dependencies);
      }
    }
  };

  traverseDependencies(packageLockJson.dependencies);

  for (const packageName of packagesToCheck) {
    if (!allDepsInLock.has(packageName)) {
      throw new Error(
        `The package "${packageName}" is not installed, please remove it from the configured ignoredPackages or licenseOverrides.`
      );
    }
  }
}

async function readPackageLock(): Promise<
  { path: string; content: PackageLockJson } | undefined
> {
  const packageLockJsonPath = await findUp('package-lock.json');

  if (packageLockJsonPath) {
    const packageLock: PackageLockJson = JSON.parse(
      await fs.readFile(packageLockJsonPath, 'utf-8')
    );

    if (packageLock.lockfileVersion !== 2) {
      throw new Error('Invalid package-lock.json version: !== 2');
    }

    return { path: packageLockJsonPath, content: packageLock };
  }
}

// Generate a hex id for any package name + version combination.
function id(pkg: Package): string {
  return crypto
    .createHash('sha256')
    .update(`${pkg.name}@${pkg.version}`)
    .digest('hex');
}

function normalizeLicenseProperty(license: string | { type: string }): string {
  if (typeof license === 'object') {
    return license.type || '';
  }

  if (typeof license === 'string') {
    return license;
  }

  return '';
}

function getLicenses(pkg: Package) {
  return (pkg.license ? [pkg.license] : pkg.licenses ?? [])
    .filter(Boolean)
    .map(normalizeLicenseProperty);
}

// Return package's licensing information as a SPDX string.
function licenseSpdx(pkg: Package): string {
  const licenses = getLicenses(pkg);

  if (!licenses.length) {
    return '';
  }

  if (licenses.length === 1) {
    return licenses[0];
  }

  return '(' + licenses.filter(Boolean).join(' OR ') + ')';
}

function indent(input: string, depth: number): string {
  return input.replace(/^/gm, ' '.repeat(depth));
}

function validatePackage(pkg: Package) {
  return ALLOWED_LICENSES.some((allowedLicense) => {
    const spdx = licenseSpdx(pkg);
    try {
      return spdxSatisfies(allowedLicense, spdx);
    } catch (error) {
      return allowedLicense === spdx;
    }
  });
}

function getMonorepoPackages(packageLock: PackageLockJson | undefined) {
  if (!packageLock?.packages?.[''].workspaces?.length) {
    return [];
  }

  const output = crossSpawn.sync('npm', ['query', '.workspace'], {
    encoding: 'utf-8',
  });

  if (output.error) {
    console.error('Error executing command:', output.error);
    process.exit(1);
  }

  const packages = JSON.parse(output.stdout);
  return packages.map(
    (pkg: { name: string; version: string }) => `${pkg.name}@${pkg.version}`
  );
}

async function readConfig(configPath: string): Promise<Config> {
  const packageLock = await readPackageLock();
  const monorepoPackages = getMonorepoPackages(packageLock?.content);

  const originalConfig = JSON.parse(await fs.readFile(configPath, 'utf-8'));

  if (packageLock?.content) {
    checkOverrides(
      [
        ...(originalConfig.ignoredPackages ?? []),
        ...Object.keys(originalConfig.licenseOverrides ?? {}),
      ],
      packageLock.content
    );
  }

  return Promise.resolve({
    ignoredOrgs: [...(originalConfig.ignoredOrgs ?? [])],
    ignoredPackages: [
      ...(originalConfig.ignoredPackages ?? []),
      ...(monorepoPackages ?? []),
    ],
    licenseOverrides: { ...(originalConfig.licenseOverrides ?? {}) },
  });
}

// Generate a markdown file containing information about all the packages'
// licensing data.
export function printLicenseInformation(
  productName: string,
  packages: Package[]
): string {
  let output = `\
The following third-party software is used by and included in **${productName}**.
This document was automatically generated on ${new Date().toDateString()}.

## List of dependencies

Package|Version|License
-------|-------|-------
${packages
  .map(
    (pkg) => `**[${pkg.name}](#${id(pkg)})**|${pkg.version}|${licenseSpdx(pkg)}`
  )
  .join('\n')}

## Package details
`;

  for (const pkg of packages) {
    const spdx = licenseSpdx(pkg);
    const linkedPackageName = pkg.private
      ? pkg.name
      : `[${pkg.name}](https://www.npmjs.com/package/${pkg.name})`;
    output += `
<a id="${id(pkg)}"></a>
### ${linkedPackageName} (version ${pkg.version})
`;
    if (pkg.description) {
      output += `> ${pkg.description}\n\n`;
    }

    output += `License tags: ${spdx}\n\n`;

    if (pkg.licenseFiles?.length) {
      output += 'License files:\n';
      for (const file of pkg.licenseFiles) {
        output += `* ${file.filename}:\n\n${indent(file.content, 6)}\n\n`;
      }
    }

    if (pkg.contributors?.length) {
      output += 'Authors:\n';
      for (const person of pkg.contributors) {
        const name =
          typeof person !== 'object'
            ? person
            : person.name +
              (person.email ? ` <[${person.email}](nomail)>` : '') +
              (person.url ? ` (${person.url})` : '');
        output += `* ${name}\n`;
      }
      output += '\n';
    }
  }
  return output;
}

function validatePackages(packages: Package[]) {
  const invalidPackages = packages.filter((pkg) => !validatePackage(pkg));

  if (invalidPackages.length) {
    console.error(
      `Generation failed, found ${invalidPackages.length} invalid packages:`
    );

    for (const pkg of invalidPackages) {
      console.error(`${pkg.name}@${pkg.version}:`, licenseSpdx(pkg));
    }

    process.exit(1);
  }
}

async function loadPackages(
  dependencyFiles: string[],
  config: Config
): Promise<Package[]> {
  return (await loadDependencyFiles<Package>(dependencyFiles))
    .filter(
      (pkg) =>
        !(config.ignoredOrgs || []).some((org) =>
          pkg.name.startsWith(org + '/')
        )
    )
    .filter(
      (pkg) =>
        !(config.ignoredPackages || []).includes(`${pkg.name}@${pkg.version}`)
    )
    .map((pkg) => ({
      ...pkg,
      license:
        (config.licenseOverrides || {})[`${pkg.name}@${pkg.version}`] ??
        pkg.license,
    }));
}

export async function generate3rdPartyNotices({
  productName,
  dependencyFiles,
  configPath,
}: {
  productName: string;
  dependencyFiles: string[];
  configPath?: string;
}): Promise<void> {
  const config: Config = await readConfig(configPath ?? 'licenses.json');
  const packages: Package[] = await loadPackages(dependencyFiles, config);

  validatePackages(packages);

  const markdown = printLicenseInformation(productName, packages);
  console.info(markdown);
}
