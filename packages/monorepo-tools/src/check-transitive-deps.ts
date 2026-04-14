#! /usr/bin/env node
/* eslint-disable no-console */

import path from 'path';
import { promises as fs } from 'fs';
import chalk from 'chalk';
import pacote from 'pacote';
import semver from 'semver';
import { listAllPackages } from './utils/list-all-packages';
import { getHighestRange } from './utils/semver-helpers';
import minimist from 'minimist';
import type { ParsedArgs } from 'minimist';

const DEPENDENCY_GROUPS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
] as const;

const USAGE = `Check transitive dependencies for version alignment.

USAGE: check-transitive-deps.js [--deps <list>] [--config <path>] [--ignore-dev-deps]

Options:

  --deps              Comma-separated list of dependencies to track.
  --config            Path to config file. Default is .check-transitive-deps.json
  --ignore-dev-deps   Ignore devDependencies when scanning both our own packages and tracked dependencies.

Config file format (.check-transitive-deps.json):
  {
    "deps": ["package-a", "@my-scope/*"]
  }

Glob patterns are supported: * matches any sequence of characters except /.
For example, @mongodb-js/* matches all packages in that scope.

For each transitive dependency, the script prints:
  - Which of our monorepo packages depend on it directly, and at what version range.
  - Which tracked direct dependencies also depend on it, and at what version range.

This lets you verify that your first-party packages and your tracked dependencies
all require the same version of a shared transitive dependency.
`;

interface Config {
  deps: string[];
}

async function loadConfig(args: ParsedArgs): Promise<Config> {
  const configPath =
    typeof args.config === 'string'
      ? path.resolve(process.cwd(), args.config)
      : path.join(process.cwd(), '.check-transitive-deps.json');

  let fileConfig: Partial<Config> = {};

  try {
    fileConfig = JSON.parse(await fs.readFile(configPath, 'utf8'));
  } catch (e: any) {
    if (e.code !== 'ENOENT' || args.config) {
      throw e;
    }
  }

  const deps =
    typeof args.deps === 'string'
      ? args.deps.split(',').map((s: string) => s.trim())
      : Array.isArray(args.deps)
        ? args.deps
        : fileConfig.deps || [];

  return { deps };
}

export function satisfiesHighest(
  range: string,
  highestVersion: string | null,
): boolean | null {
  if (!highestVersion) return null;
  if (!semver.validRange(range)) return null;
  try {
    const minVer = semver.minVersion(highestVersion);
    if (!minVer) return null;
    return semver.satisfies(minVer, range);
  } catch {
    return null;
  }
}

export function matchesAnyPattern(name: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    const regex = new RegExp(
      '^' +
        pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*') +
        '$',
    );
    return regex.test(name);
  });
}

export interface TransitiveDepsEntry {
  version: string;
  label: string;
}

// Returns a map from transitive dep name → all usages found across our packages
// and tracked external dependencies. Includes deps with only one unique version;
// callers decide whether to filter those out.
export async function gatherTransitiveDepsInfo({
  deps,
  ignoreDevDeps,
  packages,
  resolveExternal,
}: {
  deps: string[];
  ignoreDevDeps: boolean;
  packages:
    | AsyncIterable<{ packageJson: Record<string, any> }>
    | Iterable<{ packageJson: Record<string, any> }>;
  resolveExternal: (
    name: string,
    versionRange: string,
  ) => Promise<Record<string, any>>;
}): Promise<Map<string, TransitiveDepsEntry[]>> {
  const config = { deps };
  // transitiveDep → entries from our own packages that depend on it directly
  const ourDirectUsage = new Map<string, TransitiveDepsEntry[]>();

  // external dep name → set of version ranges used across our packages
  const trackedDepRanges = new Map<string, Set<string>>();

  // local package names → their package.json (to avoid npm lookups)
  const localPackages = new Map<string, Record<string, any>>();

  for await (const { packageJson } of packages) {
    const packageName: string = packageJson.name;
    localPackages.set(packageName, packageJson);
    const pkgDeps = getDepsFromPackageJson(packageJson, { ignoreDevDeps });

    for (const [depName, version] of pkgDeps) {
      if (matchesAnyPattern(depName, config.deps)) {
        let entry = ourDirectUsage.get(depName);
        if (!entry) {
          entry = [];
          ourDirectUsage.set(depName, entry);
        }
        entry.push({ version, label: packageName });
      }

      if (matchesAnyPattern(depName, config.deps)) {
        let ranges = trackedDepRanges.get(depName);
        if (!ranges) {
          ranges = new Set();
          trackedDepRanges.set(depName, ranges);
        }
        ranges.add(version);
      }
    }
  }

  // Packages that live in the monorepo are not external deps.
  for (const localPkgName of localPackages.keys()) {
    trackedDepRanges.delete(localPkgName);
  }

  // Start result with direct usages, then append indirect ones below.
  const result = new Map<string, TransitiveDepsEntry[]>();
  for (const [depName, entries] of ourDirectUsage) {
    result.set(depName, [...entries]);
  }

  for (const [trackedDepName, versionRanges] of trackedDepRanges) {
    const manifests: Array<{
      label: string;
      packageJson: Record<string, any>;
    }> = [];

    const localPkg = localPackages.get(trackedDepName);
    if (localPkg) {
      manifests.push({ label: trackedDepName, packageJson: localPkg });
    } else {
      for (const versionRange of versionRanges) {
        try {
          const packageJson = await resolveExternal(
            trackedDepName,
            versionRange,
          );
          manifests.push({
            label: `${trackedDepName}@${versionRange}`,
            packageJson,
          });
        } catch (e: any) {
          console.error(
            `Warning: could not resolve ${trackedDepName}@${versionRange}: ${e.message as string}`,
          );
        }
      }
    }

    for (const { label, packageJson } of manifests) {
      const deps = getDepsFromPackageJson(packageJson, { ignoreDevDeps });
      for (const [depName, version] of deps) {
        if (matchesAnyPattern(depName, config.deps)) {
          let entry = result.get(depName);
          if (!entry) {
            entry = [];
            result.set(depName, entry);
          }
          entry.push({ version, label: `via ${label}` });
        }
      }
    }
  }

  return result;
}

export function getDepsFromPackageJson(
  packageJson: Record<string, any>,
  { ignoreDevDeps = false }: { ignoreDevDeps?: boolean } = {},
): Map<string, string> {
  const deps = new Map<string, string>();
  for (const group of DEPENDENCY_GROUPS) {
    if (ignoreDevDeps && group === 'devDependencies') {
      continue;
    }
    for (const [name, version] of Object.entries(
      (packageJson[group] || {}) as Record<string, string>,
    )) {
      if (!deps.has(name)) {
        deps.set(name, version);
      }
    }
  }
  return deps;
}

export interface MismatchEntry {
  version: string;
  label: string;
  satisfiesHighest: boolean | null;
}

export interface Mismatch {
  name: string;
  highestVersion: string | null;
  entries: MismatchEntry[];
}

export function findMisalignments(
  groups: Map<string, TransitiveDepsEntry[]>,
): Mismatch[] {
  const mismatches: Mismatch[] = [];

  for (const name of [...groups.keys()].sort()) {
    const entries = groups.get(name)!;
    const uniqueVersions = new Set(entries.map((e) => e.version));
    if (uniqueVersions.size <= 1) {
      continue;
    }

    const allVersions = entries.map((e) => e.version);
    const highestVersion = getHighestRange(allVersions);

    mismatches.push({
      name,
      highestVersion,
      entries: entries.map((e) => ({
        version: e.version,
        label: e.label,
        satisfiesHighest: satisfiesHighest(e.version, highestVersion),
      })),
    });
  }

  return mismatches;
}

async function main(args: ParsedArgs) {
  if (args.help) {
    console.log(USAGE);
    return;
  }

  const config = await loadConfig(args);

  if (config.deps.length === 0) {
    console.error('--deps (or deps in config) must be provided and non-empty.');
    process.exitCode = 1;
    return;
  }

  const ignoreDevDeps: boolean = args['ignore-dev-deps'] === true;

  const groups = await gatherTransitiveDepsInfo({
    ...config,
    ignoreDevDeps,
    packages: listAllPackages(),
    resolveExternal: (name, versionRange) =>
      pacote.manifest(`${name}@${versionRange}`),
  });

  if (groups.size === 0) {
    console.log(
      '%s',
      chalk.green(
        'No transitive dependencies found matching the provided allow lists.',
      ),
    );
    return;
  }

  const mismatches = findMisalignments(groups);

  if (mismatches.length === 0) {
    console.log(
      '%s',
      chalk.green(
        'All transitive dependencies are aligned, nothing to report!',
      ),
    );
    return;
  }

  for (const { name, highestVersion, entries } of mismatches) {
    const versionPad = Math.max(...entries.map((e) => e.version.length));

    console.log(
      '%s  %s',
      chalk.bold(name),
      chalk.dim(`highest: ${highestVersion ?? 'unknown'}`),
    );
    console.log();

    for (const { version, label, satisfiesHighest: match } of entries) {
      const indicator =
        match === null ? ' ' : match ? chalk.green('✓') : chalk.red('✗');
      console.log(
        '%s %s%s  %s',
        indicator,
        ' '.repeat(versionPad - version.length),
        version,
        chalk.dim(label),
      );
    }

    console.log();
  }

  const misaligned = mismatches
    .filter((m) => m.entries.some((e) => e.satisfiesHighest === false))
    .map((m) => m.name);

  if (misaligned.length > 0) {
    console.log(chalk.bold.red('Misaligned transitive dependencies:'));
    console.log();
    for (const dep of misaligned) {
      console.log('  %s', dep);
    }
    console.log();
    process.exitCode = 1;
  }
}

if (process.argv[1]?.endsWith('check-transitive-deps.js')) {
  process.on('unhandledRejection', (err: Error) => {
    console.error();
    console.error(err?.stack || err?.message || err);
    process.exitCode = 1;
  });

  main(minimist(process.argv.slice(2))).catch((err) =>
    process.nextTick(() => {
      throw err;
    }),
  );
}
