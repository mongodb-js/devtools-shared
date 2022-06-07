const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const assert = require('assert');

const gitLogParser = require('git-log-parser');
const semver = require('semver');
const maxIncrement = require('./max-increment');

const LAST_BUMP_COMMIT_MESSAGE = 'chore(ci): bump packages';

async function main() {
  if (!fs.existsSync('./package.json') || !fs.existsSync('.git')) {
    throw new Error('this command can only be run from the root of a monorepo');
  }

  const monorepoRootPath = process.cwd();
  const packages = getPackages(monorepoRootPath);

  const newVersions = [];
  const range = await getRangeFromLastBump();

  for (const packageInfo of packages) {
    await processPackage(
      path.relative(monorepoRootPath, packageInfo.location),
      newVersions,
      { range }
    );
  }

  childProcess.spawnSync('npm', ['install', '--package-lock-only'], {
    stdio: 'inherit',
  });
}

main(...process.argv.slice(2)).catch((e) => {
  console.debug(e);
  process.exit(1);
});

function getPackages(cwd) {
  const { stdout, status, output } = childProcess.spawnSync(
    'npx',
    ['lerna@4.0.0', 'list', '--toposort', '--all', '--json'],
    { cwd }
  );

  if (status !== 0) {
    throw new Error(output);
  }

  return JSON.parse(stdout);
}

async function getCommits({ path, range }) {
  return new Promise((resolve) => {
    const stream = gitLogParser.parse({
      _: [range, path].filter(Boolean),
    });

    const commits = [];

    stream.on('data', (commit) => commits.push(commit));
    stream.on('end', () => resolve(commits));
  });
}

function updateDeps(packageJson, newVersions) {
  console.debug(`[${packageJson.name}]`, 'updateDeps', newVersions);
  const newPackageJson = { ...packageJson };

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

      dependenciesSection[depName] = version;

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

  // calculate bump as follows:
  // if any commit subject or body contains
  //    BREAKING CHANGE or BREAKING CHANGES
  // -> then is a major bump
  // if subject starts with feat or fix
  // -> then is a minor bump
  // everything else is a patch.
  //
  for (const { subject, body } of commits) {
    if (
      /\bBREAKING CHANGES?\b/.test(subject) ||
      /\bBREAKING CHANGES?\b/.test(body)
    ) {
      inc = 'major';
      break;
    }

    if (/^(feat|fix)[:(]/.test(subject)) {
      inc = maxIncrement(inc, 'minor');
      continue;
    }

    inc = maxIncrement(inc, 'patch');
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

  const origPackageJsonString = fs.readFileSync(packageJsonPath, 'utf-8');
  const packageJson = JSON.parse(origPackageJsonString);

  const packageJsonAfterDepBump = updateDeps(packageJson, newVersions);

  const conventionalVersion = await bumpVersionBasedOnCommits(
    packagePath,
    packageJson.version,
    options
  );

  const newVersion = semver.gt(
    conventionalVersion,
    packageJsonAfterDepBump.version
  )
    ? conventionalVersion
    : packageJsonAfterDepBump.version;

  if (semver.gt(newVersion, packageJson.version)) {
    newVersions[packageJson.name] = {
      version: newVersion,
      bump: semver.diff(newVersion, packageJson.version),
    };
  }

  const newPackageJson = { ...packageJsonAfterDepBump, version: newVersion };

  if (!deepEqual(newPackageJson, packageJson)) {
    const trailingSpacesMatch = origPackageJsonString.match(/}(\s*)$/);
    const trailingSpaces =
      (trailingSpacesMatch && trailingSpacesMatch[1]) || '';

    fs.writeFileSync(
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
