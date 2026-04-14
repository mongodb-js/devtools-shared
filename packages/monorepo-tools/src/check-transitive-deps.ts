#! /usr/bin/env node
/* eslint-disable no-console */

import path from 'path';
import { promises as fs } from 'fs';
import chalk from 'chalk';
import pacote from 'pacote';
import { listAllPackages } from './utils/list-all-packages';
import minimist from 'minimist';
import type { ParsedArgs } from 'minimist';

const DEPENDENCY_GROUPS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
] as const;

const USAGE = `Check transitive dependencies for version alignment.

USAGE: check-transitive-deps.js [--deps <list>] [--transitive-deps <list>] [--config <path>]

Options:

  --deps             Comma-separated list of direct dependencies to track.
  --transitive-deps  Comma-separated list of transitive dependencies to check alignment for.
  --config           Path to config file. Default is .check-transitive-deps.json

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
): Map<string, string> {
  const deps = new Map<string, string>();
  for (const group of DEPENDENCY_GROUPS) {
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

  for await (const { packageJson } of listAllPackages()) {
    const packageName: string = packageJson.name;
    const deps = getDepsFromPackageJson(packageJson);

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

  // For each tracked direct dep (at each version range used), resolve its package.json
  // and collect any transitive deps we care about.
  // transitiveDep → Map<"trackedDep@range", versionOfTransitiveDep>
  const viaTrackedDep = new Map<string, Map<string, string>>();

  for (const [trackedDepName, versionRanges] of trackedDepRanges) {
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

      const trackedDepDeps = getDepsFromPackageJson(resolvedManifest);
      for (const [depName, version] of trackedDepDeps) {
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
  for (const transitiveDep of [...allTransitiveDeps].sort()) {
    const directUsages = ourDirectUsage.get(transitiveDep) ?? [];
    const trackedUsages: [string, string][] = [
      ...(viaTrackedDep.get(transitiveDep) ?? new Map()),
    ];

    const allVersions = [
      ...directUsages.map((u) => u.version),
      ...trackedUsages.map(([, v]) => v),
    ];

    const uniqueVersions = new Set(allVersions);
    if (uniqueVersions.size <= 1) {
      continue;
    }

    foundMismatches = true;
    const versionPad = Math.max(...allVersions.map((v) => v.length));

    console.log(chalk.bold(transitiveDep));
    console.log();

    for (const { packageName, version } of directUsages) {
      console.log(
        '  %s%s  %s',
        ' '.repeat(versionPad - version.length),
        version,
        chalk.dim(packageName),
      );
    }

    for (const [trackedDepRef, version] of trackedUsages) {
      console.log(
        '  %s%s  %s',
        ' '.repeat(versionPad - version.length),
        version,
        chalk.dim(`via ${trackedDepRef}`),
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
