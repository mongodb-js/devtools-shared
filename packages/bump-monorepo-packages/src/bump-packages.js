#!/usr/bin/env node

const { promises: fs } = require('fs');
const path = require('path');
const childProcess = require('child_process');
const assert = require('assert');
const { promisify } = require('util');
const getPackagesInTopologicalOrder = require('./get-packages-in-topological-order');

const execFile = promisify(childProcess.execFile);

const gitLogParser = require('git-log-parser');
const semver = require('semver');

const maxIncrement = require('./max-increment');
const getConventionalBump = require('./get-conventional-bump');
const { PassThrough } = require('stream');

const LAST_BUMP_COMMIT_MESSAGE =
  process.env.LAST_BUMP_COMMIT_MESSAGE || 'chore(ci): bump packages';

function shouldSkipPackage(packageName) {
  const skippedPackages = (process.env.SKIP_BUMP_PACKAGES || '').split(',');
  const shouldSkip = skippedPackages.includes(packageName);

  console.log('Should skip', packageName, {
    packages: skippedPackages,
    shouldSkip,
  });

  return shouldSkip;
}

async function main() {
  try {
    await fs.stat('./package.json');
    await fs.stat('.git');
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(
        'this command can only be run from the root of a monorepo'
      );
    }
    throw err;
  }

  const monorepoRootPath = process.cwd();
  const packages = await getPackages(monorepoRootPath);

  const newVersions = [];
  const range = await getRangeFromLastBump();

  for (const packageInfo of packages) {
    await processPackage(
      path.relative(monorepoRootPath, packageInfo.location),
      newVersions,
      { range }
    );
  }

  await execFile('npm', ['install', '--package-lock-only'], {
    stdio: 'inherit',
  });
}

main().catch((e) => {
  console.debug(e);
  process.exit(1);
});

async function getPackages(cwd) {
  return await getPackagesInTopologicalOrder(cwd);
}

async function getCommits({ path, range }) {
  const commits = [];
  // PassThrough because gitLogParser returns a legacy stream
  const stream = gitLogParser
    .parse({
      _: [range, path].filter(Boolean),
    })
    .pipe(new PassThrough({ objectMode: true }));
  for await (const commit of stream) {
    commits.push(commit);
  }
  return commits;
}

function updateDeps(packageJson, newVersions) {
  console.debug(`[${packageJson.name}]`, 'updateDeps', newVersions);
  const newPackageJson = JSON.parse(JSON.stringify(packageJson));

  let inc;

  for (const sectionName of [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ]) {
    const dependenciesSection = newPackageJson[sectionName];
    if (!dependenciesSection) {
      continue;
    }

    for (const [depName, { version, bump: depInc }] of Object.entries(
      newVersions
    )) {
      if (!dependenciesSection[depName]) {
        console.debug(
          `[${packageJson.name}]`,
          'updateDeps',
          sectionName,
          depName,
          'skipping'
        );
        continue;
      }

      console.debug(
        `[${packageJson.name}]`,
        'updateDeps',
        sectionName,
        depName,
        '->',
        version
      );

      const oldDepRange = dependenciesSection[depName];

      // we try to preserve some of the ranges specified in the
      // original package.json as that may be useful for external dependants.
      // The default for ranges we can't recognize is a caret range.
      const newDepRange = /^\d\.\d\.\d/.exec(oldDepRange)
        ? version
        : oldDepRange === '*'
        ? '*'
        : oldDepRange.startsWith('~')
        ? `~${version}`
        : `^${version}`;

      dependenciesSection[depName] = newDepRange;

      // we increment the package version based on the bump on dependencies:
      // if a devDependency was bumped, regardless of the increment we increment of a
      // patch, otherwise we replicate the increment of the dependency. We always keep
      // the biggest increase.

      const oldInc = inc;

      inc =
        sectionName === 'devDependencies'
          ? maxIncrement('patch', inc)
          : maxIncrement(depInc, inc);

      console.debug(
        `[${packageJson.name}]`,
        'inc',
        sectionName === 'devDependencies',
        {
          depInc,
          oldInc,
          newInc: inc,
        }
      );
    }
  }

  if (inc) {
    newPackageJson.version = semver.inc(packageJson.version, inc);
  }

  console.debug(
    `[${packageJson.name}]`,
    'new package json',
    JSON.stringify(newPackageJson)
  );

  return newPackageJson;
}

async function bumpVersionBasedOnCommits(packagePath, oldVersion, options) {
  const commits = await getCommits({
    path: packagePath,
    range: options.range,
  });

  console.info(
    `[${packagePath}]`,
    commits.length,
    'commits found in range',
    commits.length ? '' : '.. skipping'
  );

  if (!commits.length) {
    return oldVersion;
  }

  let inc = 'patch';

  for (const commit of commits) {
    inc = maxIncrement(inc, getConventionalBump(commit));
  }

  const newVersion = semver.inc(oldVersion, inc);

  console.info(
    `[${packagePath}]`,
    'bumping',
    oldVersion,
    'to',
    newVersion,
    `(${inc})`
  );

  return newVersion;
}

async function getRangeFromLastBump() {
  const allCommits = await getCommits({
    path: '.',
  });

  console.info('total commits found', allCommits.length);

  const lastBumpCommit = allCommits.find((c) =>
    c.subject.startsWith(LAST_BUMP_COMMIT_MESSAGE)
  );

  console.info(
    'lastBumpCommit',
    lastBumpCommit
      ? `${lastBumpCommit.commit.long} ${lastBumpCommit.subject}`
      : '-'
  );

  const range = lastBumpCommit
    ? `${lastBumpCommit.commit.long}...HEAD`
    : undefined;

  console.info('range:', range);
  return range;
}

// walk the dep tree up

async function processPackage(packagePath, newVersions, options) {
  const packageJsonPath = path.join(packagePath, 'package.json');

  const origPackageJsonString = await fs.readFile(packageJsonPath, 'utf-8');
  const packageJson = JSON.parse(origPackageJsonString);

  const packageJsonAfterDepBump = updateDeps(packageJson, newVersions);

  let newVersion = packageJson.version;

  // if the package is in the skip list we still update its dependencies
  // but we keep its version to the old one
  if (!shouldSkipPackage(packageJson.name)) {
    const conventionalVersion = await bumpVersionBasedOnCommits(
      packagePath,
      packageJson.version,
      options
    );

    newVersion = semver.gt(conventionalVersion, packageJsonAfterDepBump.version)
      ? conventionalVersion
      : packageJsonAfterDepBump.version;

    if (semver.gt(newVersion, packageJson.version)) {
      newVersions[packageJson.name] = {
        version: newVersion,
        bump: semver.diff(newVersion, packageJson.version),
      };
    }
  }

  const newPackageJson = { ...packageJsonAfterDepBump, version: newVersion };

  if (!deepEqual(newPackageJson, packageJson)) {
    const trailingSpacesMatch = origPackageJsonString.match(/}(\s*)$/);
    const trailingSpaces =
      (trailingSpacesMatch && trailingSpacesMatch[1]) || '';

    await fs.writeFile(
      packageJsonPath,
      JSON.stringify(newPackageJson, null, 2) + trailingSpaces,
      'utf-8'
    );
  }
}

const deepEqual = (obj1, obj2) => {
  try {
    assert.deepEqual(obj1, obj2);
    return true;
  } catch (error) {
    return false;
  }
};
