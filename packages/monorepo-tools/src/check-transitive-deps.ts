#! /usr/bin/env node
/* eslint-disable no-console */

import path from 'path';
import { promises as fs } from 'fs';
import chalk from 'chalk';
import pacote from 'pacote';
import { listAllPackages } from './utils/list-all-packages';
import minimist from 'minimist';
import type { ParsedArgs } from 'minimist';
import {
  gatherTransitiveDepsInfo,
  findMisalignments,
} from './utils/package-helpers';

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
