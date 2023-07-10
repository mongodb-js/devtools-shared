/* eslint-disable no-console */
import crypto from 'crypto';
import spdxSatisfies from 'spdx-satisfies';

import { promises as fs } from 'fs';

import type { Package } from '../get-package-info';
import { loadDependencyFiles } from '../load-dependency-files';
import { Command } from 'commander';

type Config = {
  ignoredOrgs: string[];
  ignoredPackages: string[];
  doNotValidatePackages: string[];
  licenseOverrides: Record<string, string>;
  additionalAllowedLicenses: string[];
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

function checkOverrides(packagesToCheck: string[], dependencies: Package[]) {
  const depsSet = new Set(
    dependencies.map(({ name, version }) => `${name}@${version}`)
  );

  for (const packageName of packagesToCheck) {
    if (!depsSet.has(packageName)) {
      throw new Error(
        `The package "${packageName}" is not appearing in the dependencies, please remove it from the configured ignoredPackages or licenseOverrides.`
      );
    }
  }
}

// Generate a hex id for any package name + version combination.
function id(pkg: Package): string {
  return crypto
    .createHash('sha256')
    .update(packageNameAndVersion(pkg))
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

function validatePackage(pkg: Package, config: Config) {
  return [...ALLOWED_LICENSES, ...config.additionalAllowedLicenses].some(
    (allowedLicense) => {
      const spdx = licenseSpdx(pkg);
      try {
        return spdxSatisfies(allowedLicense, spdx);
      } catch (error) {
        return allowedLicense === spdx;
      }
    }
  );
}

async function readConfig(configPath: string): Promise<Config> {
  const originalConfig: Partial<Config> = JSON.parse(
    await fs.readFile(configPath, 'utf-8')
  );

  return Promise.resolve({
    ignoredOrgs: [...(originalConfig.ignoredOrgs ?? [])],
    ignoredPackages: [...(originalConfig.ignoredPackages ?? [])],
    licenseOverrides: { ...(originalConfig.licenseOverrides ?? {}) },
    doNotValidatePackages: [...(originalConfig.doNotValidatePackages ?? [])],
    additionalAllowedLicenses: [
      ...(originalConfig.additionalAllowedLicenses ?? []),
    ],
  });
}

const packageNameAndVersion = (pkg: Package) => `${pkg.name}@${pkg.version}`;

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

function validatePackages(packages: Package[], config: Config) {
  const invalidPackages = packages
    .filter(
      (pkg) =>
        !config.doNotValidatePackages.includes(packageNameAndVersion(pkg))
    )
    .filter((pkg) => !validatePackage(pkg, config));

  if (invalidPackages.length) {
    throw new Error(
      [
        `Generation failed, found ${invalidPackages.length} invalid packages:`,
        ...invalidPackages.map(
          (pkg) => `- ${pkg.name}@${pkg.version}: ${licenseSpdx(pkg)}`
        ),
      ].join('\n')
    );
  }
}

function applyConfig(dependencies: Package[], config: Config): Package[] {
  checkOverrides(
    [
      ...config.ignoredPackages,
      ...config.doNotValidatePackages,
      ...Object.keys(config.licenseOverrides),
    ],
    dependencies
  );

  return dependencies
    .filter(
      (pkg) =>
        !(config.ignoredOrgs || []).some((org) =>
          pkg.name.startsWith(org + '/')
        )
    )
    .filter(
      (pkg) =>
        !(config.ignoredPackages || []).includes(packageNameAndVersion(pkg))
    )
    .map((pkg) => ({
      ...pkg,
      license:
        (config.licenseOverrides || {})[packageNameAndVersion(pkg)] ??
        pkg.license,
    }));
}

export async function generate3rdPartyNotices({
  productName,
  dependencyFiles,
  configPath,
  printResult,
}: {
  productName: string;
  dependencyFiles: string[];
  configPath?: string;
  printResult?: (result: string) => void;
}): Promise<void> {
  const config: Config = await readConfig(configPath ?? 'licenses.json');
  const allPackages = await loadDependencyFiles<Package>(dependencyFiles);
  const packages: Package[] = applyConfig(allPackages, config);

  validatePackages(packages, config);

  const markdown = printLicenseInformation(productName, packages);
  (printResult ?? console.info)(markdown);
}

function commaSeparatedList(value: string) {
  return value.split(',');
}

export const command = new Command('generate-3rd-party-notices')
  .description('Generate third-party notices')
  .option('--product <productName>', 'Product name')
  .option(
    '--config [config]',
    'Path of the configuration file',
    'licenses.json'
  )
  .option(
    '--dependencies <paths>',
    'Comma-separated list of dependency files',
    commaSeparatedList,
    []
  )
  .action(async (options) => {
    await generate3rdPartyNotices({
      productName: options.product,
      dependencyFiles: options.dependencies,
      configPath: options.config,
    });
  });
