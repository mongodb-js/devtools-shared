#! /usr/bin/env node
/* eslint-disable no-console */

import path from 'path';
import { promises as fs } from 'fs';
import chalk from 'chalk';
import pacote from 'pacote';
import { runInDir } from './utils/run-in-dir';
import { listAllPackages } from './utils/list-all-packages';
import { updatePackageJson } from './utils/update-package-json';
import { withProgress } from './utils/with-progress';
import type { WorkspaceDependencyInfo } from './utils/workspace-dependencies';
import {
  collectWorkspacesMeta,
  collectWorkspacesDependencies,
} from './utils/workspace-dependencies';
import { calculateReplacements, intersects } from './utils/semver-helpers';
import type { ParsedArgs } from 'minimist';
import minimist from 'minimist';
import type ora from 'ora';

const DEPENDENCY_GROUPS = [
  'peerDependencies',
  'dependencies',
  'devDependencies',
] as const;

const USAGE = `Check for dependency alignment issues.

USAGE: depalign.js [--skip-deduped] [--json] [--autofix] [--type peer,optional]

Options:

  --skip-deduped                     Don't output warnings and don't autofix ranges that can be resolved to a single version.
  --json                             Output a json report.
  --type                             Type (or types) of the dependencies to include in the report. Possible values are 'prod', 'dev', 'peer', and 'optional'. Defaults to prod, dev, and optional.
  --types-only                       Will only include a dependency in the report if all packages have this dependency as one of the provided with --type argument.
  --autofix                          Output a list of replacements to normalize ranges and align everything to the highest possible range.
  --autofix-only                     Will only autofix dependencies provided with this option
  --align                            Update peerDepencencies, dependencies and devDependencies that specify the package
  --range                            The range to use when aligning (default latest)
  --dangerously-include-mismatched   Include mismatched dependencies into autofix.
  --config                           Path to the config. Default is .depalignrc.json
  --validate-config                  Check that 'ignore' option in the config doesn't include extraneous dependencies and versions

.depalignrc.json

.depalignrc.json can list ignored dependency ranges that will be excluded from the check.

For example: {"ignore": {"async": ["^1.2.3"]}}.
`;

async function main(args: ParsedArgs) {
  if (args.help) {
    console.log(USAGE);
    return;
  }

  const depalignrcPath =
    typeof args.config === 'string'
      ? path.resolve(process.cwd(), args.config)
      : path.join(process.cwd(), '.depalignrc.json');

  let depalignrc: Record<string, any>;

  if (typeof args.config === 'boolean' && !args.config) {
    depalignrc = {};
  } else {
    try {
      depalignrc = JSON.parse(await fs.readFile(depalignrcPath, 'utf8'));
    } catch (e: any) {
      if (e.code === 'ENOENT' && args.config) {
        console.error("Can't find config at path %s.", depalignrcPath);
        throw e;
      } else if (e.code !== 'ENOENT') {
        console.error('Unexpected error happened loading config file:');
        throw e;
      }
      // We didn't find the file and it's a default config path that we were
      // checking for, we can ignore that as config file is optional
      depalignrc = {};
    }
  }

  const outputJson = args.json;
  const shouldApplyFixes = args.autofix;
  const alignPackage = args.align;
  const alignToRange = args.range || 'latest';
  const shouldCheckConfig = args['validate-config'];
  const fixOnly = new Set(args['autofix-only']);
  const includeTypes = args.type;
  const includeTypesOnly = args['types-only'];
  const includeDeduped = !args['skip-deduped'];
  const includeMismatched = args['dangerously-include-mismatched'];

  if (alignPackage) {
    await alignPackageToRange(alignPackage, alignToRange);
    return;
  }

  const workspaces = await collectWorkspacesMeta();
  const dependencies = collectWorkspacesDependencies(workspaces);
  const report = generateReport(dependencies, {
    includeTypes,
    includeTypesOnly,
    ...depalignrc,
    // We want a full report with ignore option "disabled" so that we can check
    // config against all existing mismatches
    ...(shouldCheckConfig && { ignore: {} }),
  });

  if (shouldCheckConfig) {
    const { ignore, extraneous } = normalizeIgnore(report, depalignrc.ignore);

    if (shouldApplyFixes) {
      await fs.writeFile(
        depalignrcPath,
        JSON.stringify({ ...depalignrc, ignore }, null, 2),
        'utf8'
      );

      extraneous.clear();
    }

    if (extraneous.size > 0) {
      console.log(
        'Following extraneous versions found in the `ignore` config option in %s: %s',
        path.relative(process.cwd(), depalignrcPath),
        chalk.dim('(can be fixed with --autofix)')
      );
      console.log();

      for (const [depName, versions] of extraneous) {
        const versionPadStart = Math.max(
          ...versions.map((version) => version.length)
        );
        console.log(
          '  %s %s',
          chalk.bold(depName),
          versions.length === depalignrc.ignore[depName].length
            ? chalk.dim('(whole rule)')
            : ''
        );
        console.log();
        for (const version of versions) {
          console.log(
            '    %s%s',
            ' '.repeat(versionPadStart - version.length),
            version
          );
        }
        console.log();
      }
    } else {
      console.log(
        '%s',
        chalk.green('No extraneous rules found in depalign config')
      );
    }

    process.exitCode = extraneous.size;
    return;
  }

  if (!includeDeduped) {
    report.deduped = new Map();
  }

  if (shouldApplyFixes) {
    if (includeMismatched) {
      console.log();
      console.log(
        `%s: You are about to update mismatched dependencies which might potentially be a %s. Please make sure that everything is still working as expected after the update.`,
        chalk.yellow('Warning'),
        chalk.bold('breaking change')
      );
      console.log();
    }

    await withProgress(
      `Applying autofixes`,
      applyFixes,
      report,
      includeMismatched,
      fixOnly
    );

    console.log();
  }

  if (outputJson) {
    console.log(
      JSON.stringify(
        report,
        (_key, val) => {
          if (val instanceof Map) {
            return Object.fromEntries(val);
          } else if (val instanceof Set) {
            return Array.from(val);
          } else {
            return val;
          }
        },
        2
      )
    );
  } else {
    prettyPrintReport(report);
  }

  process.exitCode = report.mismatched.size;
}

async function alignPackageToRange(packageName: string, range: string) {
  range =
    range === 'latest'
      ? // resolve in registry so we don't update package.json to literally "latest"
        `^${(await pacote.manifest(`${packageName}@${range}`)).version}`
      : range;

  for await (const { location, packageJson } of listAllPackages()) {
    if (!hasDep(packageJson, packageName)) {
      return;
    }

    await updatePackageJson(location, (pkgJson) => {
      return updateDepToRange(pkgJson, packageName, range);
    });
  }

  await runInDir('npm install');
}

function hasDep(
  packageJson: Record<string, any>,
  packageName: string
): boolean {
  for (const group of DEPENDENCY_GROUPS) {
    if (packageJson[group] && packageJson[group][packageName]) {
      return true;
    }
  }

  return false;
}

function updateDepToRange(
  packageJson: Record<string, any>,
  packageName: string,
  range: string
): Record<string, any> {
  const updated = { ...packageJson };

  for (const group of DEPENDENCY_GROUPS) {
    if (packageJson[group] && packageJson[group][packageName]) {
      updated[group] = { ...packageJson[group], [packageName]: range };
    }
  }

  return updated;
}

interface ReportItem {
  versions: WorkspaceDependencyInfo[];
  fixes: Map<string, string>;
}
interface Report {
  mismatched: Map<string, ReportItem>;
  deduped: Map<string, ReportItem>;
}
function generateReport(
  dependencies: ReturnType<typeof collectWorkspacesDependencies>,
  {
    includeTypes,
    includeTypesOnly,
    ignore = {},
  }: {
    includeTypes?: string | string[];
    includeTypesOnly?: boolean;
    ignore?: Record<string, string[]>;
  } = {}
) {
  const report: Report = { mismatched: new Map(), deduped: new Map() };

  for (const [depName, versions] of dependencies) {
    const ignoredVersions = new Set(ignore[depName] || []);
    const notIgnoredVersions = versions.filter(
      ({ version }) => !ignoredVersions.has(version)
    );
    const notIgnoredUniqueVersionsOnly = Array.from(
      new Set(notIgnoredVersions.map(({ version }) => version))
    );

    if (notIgnoredUniqueVersionsOnly.length <= 1) {
      continue;
    }

    if (
      includeTypesOnly
        ? !notIgnoredVersions.every(({ type }) => includeTypes?.includes(type))
        : !notIgnoredVersions.some(({ type }) => includeTypes?.includes(type))
    ) {
      continue;
    }

    const reportItem = {
      versions: notIgnoredVersions,
      fixes: calculateReplacements(notIgnoredUniqueVersionsOnly),
    };

    if (!intersects(notIgnoredUniqueVersionsOnly)) {
      report.mismatched.set(depName, reportItem);
    } else {
      report.deduped.set(depName, reportItem);
    }
  }

  return report;
}

function normalizeIgnore(
  { deduped, mismatched }: Report,
  ignore: Record<string, string[]> = {}
) {
  const ignoreMap = new Map(Object.entries(ignore));
  const mergedReport = new Map([...deduped, ...mismatched]);
  const extraneous = new Map<string, string[]>();
  const newIgnore = { ...ignore };

  for (const [depName, versions] of ignoreMap) {
    if (mergedReport.has(depName)) {
      generateReport;
      const reportItemVersionsOnly = new Set(
        mergedReport
          .get(depName)
          ?.versions.map(({ version }: { version: string }) => version)
      );
      const extraneousVersions = versions.filter(
        (version) => !reportItemVersionsOnly.has(version)
      );
      if (extraneousVersions.length > 0) {
        extraneous.set(depName, extraneousVersions);
      }
      newIgnore[depName] = versions.filter((version) =>
        reportItemVersionsOnly.has(version)
      );
    } else {
      extraneous.set(depName, versions);
      delete newIgnore[depName];
    }
  }

  return { ignore: newIgnore, extraneous };
}

async function applyFixes(
  this: ora.Ora,
  { deduped, mismatched }: Report,
  includeMismatched = false,
  fixOnly = new Set()
) {
  // eslint-disable-next-line @typescript-eslint/no-this-alias
  const spinner = this;
  const spinnerText = spinner.text;

  const fixAll = fixOnly.size === 0;

  const updates = new Map([
    ...deduped,
    ...(includeMismatched ? mismatched : []),
  ]);

  if (updates.size === 0) {
    return updates.size;
  }

  const totalToUpdate = fixAll ? updates.size : fixOnly.size;

  spinner.text = `${spinnerText} for ${totalToUpdate} dependencies (collecting info)`;

  const updatesByPackage = new Map<string, Map<string, string>>();

  for (const [depName, { versions, fixes }] of updates) {
    if (!fixAll && !fixOnly.has(depName)) {
      continue;
    }

    deduped.delete(depName);
    mismatched.delete(depName);

    for (const { version, from } of versions) {
      // Deduped versions will always have a fix, for mismatched we fall back to
      // highest version (you need to opt in into this potentially breaking
      // update so you should know what you're doing)
      const fixVersion = fixes.get(version) || fixes.values().next().value;

      if (updatesByPackage.has(from)) {
        updatesByPackage.get(from)!.set(depName, fixVersion);
      } else {
        updatesByPackage.set(from, new Map([[depName, fixVersion]]));
      }
    }
  }

  spinner.text = `${spinnerText} for ${totalToUpdate} dependencies (updating package.json)`;

  for (const [location, updates] of updatesByPackage) {
    await updatePackageJson(location, (pkgJson) => {
      for (const [name, version] of updates) {
        for (const depType of [
          'dependencies',
          'devDependencies',
          'peerDependencies',
          'optionalDependencies',
        ]) {
          if ((pkgJson[depType] || {})[name]) {
            pkgJson[depType][name] = version;
          }
        }
      }
      return pkgJson;
    });
  }

  spinner.text = `${spinnerText} for ${totalToUpdate} dependencies (updating package-lock.json)`;

  await runInDir('npm install --package-lock-only');

  spinner.text = `${spinnerText} for ${totalToUpdate} dependencies`;

  return updates.size;
}

function prettyPrintReport({ deduped, mismatched }: Report) {
  function printReportItems(items: Map<string, ReportItem>) {
    for (const [depName, { versions }] of items) {
      const versionPadStart = Math.max(
        ...versions.map(({ version }) => version.length)
      );
      console.log('  %s', chalk.bold(depName));
      console.log();
      for (const { version, from, type } of versions) {
        console.log(
          '    %s%s %s',
          ' '.repeat(versionPadStart - version.length),
          version,
          chalk.dim(
            `at ${path.relative(process.cwd(), from) || 'root'} ${
              // Not printing prod ones as it's kinda implied
              type !== 'prod' ? `(${type})` : ''
            }`.trim()
          )
        );
      }
      console.log();
    }
  }

  if (deduped.size > 0) {
    console.log(
      '%s %s',
      chalk.bold.yellow('Deduped:'),
      chalk.dim('(can be fixed with --autofix)')
    );
    console.log();
    printReportItems(deduped);
  }

  if (mismatched.size > 0) {
    console.log(chalk.bold.red('Mismatched:'));
    console.log();
    printReportItems(mismatched);
  }

  if (deduped.size === 0 && mismatched.size === 0) {
    console.log(
      '%s',
      chalk.green('All dependencies are aligned, nothing to report!')
    );
  }
}

process.on('unhandledRejection', (err: Error) => {
  console.error();
  console.error(err?.stack || err?.message || err);
  process.exitCode = 1;
});

function parseOptions() {
  const args = minimist(process.argv.slice(2));

  if (typeof args.type === 'string') {
    args.type = args.type.split(',');
  }

  if (typeof args['autofix-only'] === 'string') {
    args['autofix-only'] = args['autofix-only'].split(',');
  }

  return {
    ['skip-deduped']: false,
    json: false,
    type: ['prod', 'dev', 'optional'],
    ['types-only']: false,
    autofix: false,
    ['autofix-only']: [],
    ['dangerously-include-mismatched']: false,
    ['validate-config']: false,
    ...args,
  };
}

main(parseOptions()).catch((err) =>
  process.nextTick(() => {
    throw err;
  })
);
