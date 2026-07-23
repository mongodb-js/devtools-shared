#! /usr/bin/env node
// Prints the `lerna run` filter flags (`--scope <name> ...`) for the packages
// that belong to a given test group. Packages are distributed round-robin over
// the groups after sorting by name, so the assignment is stable across runs and
// every package with a `test-ci` script lands in exactly one group.
//
// Usage: node compute-test-group.mjs <groupIndex> <totalGroups>
//   groupIndex is 1-based.

import { readFileSync, readdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const groupIndex = Number.parseInt(process.argv[2], 10);
const totalGroups = Number.parseInt(process.argv[3], 10);

if (
  !Number.isInteger(groupIndex) ||
  !Number.isInteger(totalGroups) ||
  groupIndex < 1 ||
  totalGroups < 1 ||
  groupIndex > totalGroups
) {
  throw new Error(
    `Invalid group arguments: groupIndex=${process.argv[2]} totalGroups=${process.argv[3]} ` +
      `(expected 1 <= groupIndex <= totalGroups)`,
  );
}

// Resolve the repo root relative to this script (.github/workflows/).
const repoRoot = path.resolve(fileURLToPath(import.meta.url), '../../..');

// Keep this in sync with the `packages` globs in lerna.json.
const workspaceGlobs = ['packages', 'configs'];
const explicitDirs = ['scripts'];

const packageDirs = [
  ...workspaceGlobs.flatMap((glob) => {
    const base = path.join(repoRoot, glob);
    if (!existsSync(base)) return [];
    return readdirSync(base, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(base, entry.name));
  }),
  ...explicitDirs.map((dir) => path.join(repoRoot, dir)),
];

const testablePackages = packageDirs
  .map((dir) => path.join(dir, 'package.json'))
  .filter((manifestPath) => existsSync(manifestPath))
  .map((manifestPath) => JSON.parse(readFileSync(manifestPath, 'utf8')))
  .filter((manifest) => manifest.scripts && manifest.scripts['test-ci'])
  .map((manifest) => manifest.name)
  .sort();

const groupPackages = testablePackages.filter(
  (_name, index) => index % totalGroups === groupIndex - 1,
);

if (groupPackages.length === 0) {
  // Emit a filter that matches nothing so `lerna run` becomes a no-op rather
  // than falling back to running every package.
  process.stdout.write('--scope __no_packages_in_this_group__');
} else {
  process.stdout.write(groupPackages.map((name) => `--scope ${name}`).join(' '));
}
