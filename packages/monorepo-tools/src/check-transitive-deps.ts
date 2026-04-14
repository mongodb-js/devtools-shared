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

USAGE: check-transitive-deps.js [--deps <list>] [--transitive-deps <list>] [--config <path>] [--ignore-dev-deps]

Options:

  --deps              Comma-separated list of direct dependencies to track.
  --transitive-deps   Comma-separated list of transitive dependencies to check alignment for.
  --config            Path to config file. Default is .check-transitive-deps.json
  --ignore-dev-deps   Ignore devDependencies when scanning both our own packages and tracked dependencies.

Config file format (.check-transitive-deps.json):
  {
    "deps": ["package-a", "@my-scope/*"],
    "transitiveDeps": ["package-x", "package-y"]
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
  transitiveDeps: string[];
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

  const transitiveDeps =
    typeof args['transitive-deps'] === 'string'
      ? args['transitive-deps'].split(',').map((s: string) => s.trim())
      : Array.isArray(args['transitive-deps'])
        ? args['transitive-deps']
        : fileConfig.transitiveDeps || [];

  return { deps, transitiveDeps };
}

function satisfiesHighest(
  range: string,
  highestVersion: string | null,
): boolean | null {
  if (!highestVersion) return null;
  try {
    const minVer = semver.minVersion(highestVersion);
    if (!minVer) return null;
    return semver.satisfies(minVer, range);
  } catch {
    return null;
  }
}

function matchesAnyPattern(name: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    const regex = new RegExp(
      '^' +
        pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*') +
        '$',
    );
    return regex.test(name);
  });
}

function getDepsFromPackageJson(
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

async function main(args: ParsedArgs) {
  if (args.help) {
    console.log(USAGE);
    return;
  }

  const config = await loadConfig(args);

  if (config.deps.length === 0 || config.transitiveDeps.length === 0) {
    console.error(
      'Both --deps (or deps in config) and --transitive-deps (or transitiveDeps in config) must be provided and non-empty.',
    );
    process.exitCode = 1;
    return;
  }

  // Our packages that directly depend on a transitive dep we care about.
  // transitiveDep → [{ packageName, version }]
  const ourDirectUsage = new Map<
    string,
    Array<{ packageName: string; version: string }>
  >();

  // Tracked direct deps and the version ranges our packages use for them.
  // trackedDep → Set<versionRange>
  const trackedDepRanges = new Map<string, Set<string>>();

  const ignoreDevDeps: boolean = args['ignore-dev-deps'] === true;

  // Collect local monorepo package.json objects so we can resolve their deps
  // locally instead of hitting the npm registry (they may be private / unpublished).
  const localPackages = new Map<string, Record<string, unknown>>();

  for await (const { packageJson } of listAllPackages()) {
    const packageName: string = packageJson.name;
    localPackages.set(packageName, packageJson);
    const deps = getDepsFromPackageJson(packageJson, { ignoreDevDeps });

    for (const [depName, version] of deps) {
      if (matchesAnyPattern(depName, config.transitiveDeps)) {
        let entry = ourDirectUsage.get(depName);
        if (!entry) {
          entry = [];
          ourDirectUsage.set(depName, entry);
        }
        entry.push({ packageName, version });
      }

      if (matchesAnyPattern(depName, config.deps)) {
        let entry = trackedDepRanges.get(depName);
        if (!entry) {
          entry = new Set();
          trackedDepRanges.set(depName, entry);
        }
        entry.add(version);
      }
    }
  }

  // Packages that live inside the monorepo are never external deps — remove any
  // that crept into trackedDepRanges because one of our packages depends on them.
  for (const localPkgName of localPackages.keys()) {
    trackedDepRanges.delete(localPkgName);
  }

  // For each tracked direct dep (at each version range used), resolve its package.json
  // and collect any transitive deps we care about.
  // transitiveDep → Map<"trackedDep@range", versionOfTransitiveDep>
  const viaTrackedDep = new Map<string, Map<string, string>>();

  for (const [trackedDepName, versionRanges] of trackedDepRanges) {
    // For local monorepo packages, resolve deps from the local package.json
    // instead of hitting the npm registry (they may be private / unpublished).
    const localPkg = localPackages.get(trackedDepName);
    if (localPkg) {
      const trackedDepDeps = getDepsFromPackageJson(localPkg, {
        ignoreDevDeps,
      });
      for (const [depName, version] of trackedDepDeps) {
        if (matchesAnyPattern(depName, config.transitiveDeps)) {
          let entry = viaTrackedDep.get(depName);
          if (!entry) {
            entry = new Map();
            viaTrackedDep.set(depName, entry);
          }
          entry.set(trackedDepName, version);
        }
      }
      continue;
    }

    for (const versionRange of versionRanges) {
      let resolvedManifest: Record<string, any>;
      try {
        resolvedManifest = await pacote.manifest(
          `${trackedDepName}@${versionRange}`,
        );
      } catch (e: any) {
        console.error(
          `Warning: could not resolve ${trackedDepName}@${versionRange}: ${e.message as string}`,
        );
        continue;
      }

      const trackedDepDeps = getDepsFromPackageJson(resolvedManifest, {
        ignoreDevDeps,
      });
      for (const [depName, version] of trackedDepDeps) {
        // We're only interested in deps that we use ourselves.
        // TODO: Do we want this?
        //if (!ourDirectUsage.has(depName)) {
        //  continue;
        //}

        if (matchesAnyPattern(depName, config.transitiveDeps)) {
          let entry = viaTrackedDep.get(depName);
          if (!entry) {
            entry = new Map();
            viaTrackedDep.set(depName, entry);
          }
          entry.set(`${trackedDepName}@${versionRange}`, version);
        }
      }
    }
  }

  const allTransitiveDeps = new Set([
    ...ourDirectUsage.keys(),
    ...viaTrackedDep.keys(),
  ]);

  if (allTransitiveDeps.size === 0) {
    console.log(
      '%s',
      chalk.green(
        'No transitive dependencies found matching the provided allow lists.',
      ),
    );
    return;
  }

  let foundMismatches = false;
  const misaligned: string[] = [];
  for (const transitiveDep of [...allTransitiveDeps].sort()) {
    const entries = [
      ...(ourDirectUsage.get(transitiveDep) ?? []).map(
        ({ packageName, version }) => ({ version, label: packageName }),
      ),
      ...[...(viaTrackedDep.get(transitiveDep) ?? new Map())].map(
        ([trackedDepRef, version]) => ({
          version,
          label: `via ${trackedDepRef}`,
        }),
      ),
    ];

    const uniqueVersions = new Set(entries.map((e) => e.version));
    if (uniqueVersions.size <= 1) {
      continue;
    }

    foundMismatches = true;
    const allVersions = entries.map((e) => e.version);
    const highestVersion = getHighestRange(allVersions);

    if (
      entries.some((e) => satisfiesHighest(e.version, highestVersion) === false)
    ) {
      misaligned.push(transitiveDep);
    }

    const versionPad = Math.max(...allVersions.map((v) => v.length));

    console.log(
      '%s  %s',
      chalk.bold(transitiveDep),
      chalk.dim(`highest: ${highestVersion ?? 'unknown'}`),
    );
    console.log();

    for (const { version, label } of entries) {
      const match = satisfiesHighest(version, highestVersion);
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

  if (!foundMismatches) {
    console.log(
      '%s',
      chalk.green(
        'All transitive dependencies are aligned, nothing to report!',
      ),
    );
  } else if (misaligned.length > 0) {
    console.log(chalk.bold.red('Misaligned transitive dependencies:'));
    console.log();
    for (const dep of misaligned) {
      console.log('  %s', dep);
    }
    console.log();
    process.exitCode = 1;
  }
}

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
