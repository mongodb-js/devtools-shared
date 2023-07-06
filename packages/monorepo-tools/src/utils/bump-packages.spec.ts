/* eslint-disable @typescript-eslint/no-var-requires */
import fs from 'fs';
import childProcess from 'child_process';
import path from 'path';
import os from 'os';
import assert from 'assert';

const MAIN_BRANCH = 'main';

describe('bump-packages', function () {
  before(function () {
    // we don't need to test on win since this task runs on ubuntu
    if (process.platform === 'win32') {
      this.skip();
    }
  });

  this.timeout(60000);
  let tempDir;
  let remote;
  let repoPath;

  const addPackage = (packageJsonOptions) => {
    const packagePath = path.join(
      repoPath,
      'packages',
      packageJsonOptions.name
    );

    fs.mkdirSync(packagePath, {
      recursive: true,
    });

    fs.writeFileSync(
      path.join(packagePath, './package.json'),
      JSON.stringify({
        version: '1.0.0',
        ...packageJsonOptions,
      })
    );
  };

  function commitFile(changeFile, commitMessage) {
    childProcess.spawnSync(
      'git',
      ['add', path.relative(repoPath, changeFile)],
      { cwd: repoPath }
    );
    childProcess.spawnSync('git', ['commit', '-am', commitMessage], {
      cwd: repoPath,
    });
  }

  const commitRootChange = (commitMessage) => {
    const timestamp = Date.now().toString();
    const changeFile = path.join(repoPath, `${timestamp}.txt`);

    fs.writeFileSync(changeFile, timestamp);

    commitFile(changeFile, commitMessage);
  };

  function makeBumpCommit() {
    commitRootChange('chore(ci): bump packages (#1)');
  }

  const commitPackageChange = (packageName, commitMessage) => {
    const packagePath = path.join(repoPath, 'packages', packageName);
    const timestamp = Date.now().toString();
    const changeFile = path.join(packagePath, `${timestamp}.txt`);

    fs.writeFileSync(changeFile, timestamp);
    commitFile(changeFile, commitMessage);
  };

  const runBumpVersion = () => {
    // eslint-disable-next-line no-console
    console.log('runBumpVersion');
    const { status } = childProcess.spawnSync(
      'node',
      [path.resolve(__dirname, '..', '..', 'dist', 'bump-packages.js')],
      { cwd: repoPath, stdio: 'inherit' }
    );

    if (status !== 0) {
      throw new Error('runBumpVersion failed');
    }
  };

  const readAllManifests = () => {
    const manifests: Record<string, any> = {};
    for (let i = 1; i <= 6; i++) {
      const packageJsonPath = path.join(
        repoPath,
        'packages',
        `package${i}`,
        'package.json'
      );

      manifests[`package${i}`] = JSON.parse(
        fs.readFileSync(packageJsonPath, 'utf8')
      );
    }

    manifests.lock = JSON.parse(
      fs.readFileSync(path.join(repoPath, 'package-lock.json'), 'utf8')
    );

    return manifests;
  };

  beforeEach(function () {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'compass-release-tests-'));

    // create fake git remote:
    remote = path.resolve(tempDir, 'remote');
    fs.mkdirSync(remote, { recursive: true });
    process.chdir(remote);
    childProcess.spawnSync('git', ['init', '--bare']);
    childProcess.spawnSync('git', ['config', '--local', 'user.name', 'user']);
    childProcess.spawnSync('git', [
      'config',
      '--local',
      'user.email',
      'user@example.com',
    ]);

    // setup repo and package:
    repoPath = path.resolve(tempDir, 'test-repo');
    fs.mkdirSync(repoPath, { recursive: true });

    fs.writeFileSync(
      path.join(repoPath, './package.json'),
      JSON.stringify({
        name: 'test-repo',
        version: '1.0.0',
        private: true,
        workspaces: ['packages/*'],
      })
    );
    fs.writeFileSync(
      path.join(repoPath, './lerna.json'),
      JSON.stringify({
        packages: ['packages/*'],
        version: 'independent',
      })
    );

    const spawnOptions = { cwd: repoPath, stdio: 'inherit' } as const;

    childProcess.spawnSync('git', ['init'], spawnOptions);
    childProcess.spawnSync(
      'git',
      ['config', '--local', 'user.name', 'user'],
      spawnOptions
    );
    childProcess.spawnSync(
      'git',
      ['config', '--local', 'user.email', 'user@example.com'],
      spawnOptions
    );
    childProcess.spawnSync(
      'git',
      ['checkout', '-b', MAIN_BRANCH],
      spawnOptions
    );
    childProcess.spawnSync(
      'git',
      ['remote', 'add', 'origin', remote],
      spawnOptions
    );

    addPackage({ name: 'package1' });

    addPackage({
      name: 'package2',
      devDependencies: { package1: '1.0.0' },
    });

    addPackage({
      name: 'package3',
      private: true,
      devDependencies: { package1: '1.0.0' },
    });

    addPackage({
      name: 'package4',
      dependencies: { package3: '1.0.0' },
    });

    addPackage({
      name: 'package5',
      dependencies: { package1: '1.0.0' },
    });

    addPackage({
      name: 'package6',
      devDependencies: { package5: '1.0.0' },
    });

    childProcess.spawnSync('npm', ['install'], spawnOptions); // generates package-lock.json
    childProcess.spawnSync('git', ['add', '.'], spawnOptions);
    childProcess.spawnSync('git', ['commit', '-am', 'init'], spawnOptions);
    childProcess.spawnSync(
      'git',
      ['push', '--set-upstream', 'origin', MAIN_BRANCH],
      spawnOptions
    );
  });

  // eslint-disable-next-line mocha/no-sibling-hooks
  afterEach(function () {
    try {
      fs.rmSync(tempDir, { force: true });
    } catch (e) {
      // windows fails to clean those up sometimes, let's just skip it and move
      // forward with runnning the tests
    }
  });

  it('bumps everything when no previous bump commit was found', function () {
    runBumpVersion();
    const manifests = readAllManifests();

    assert.deepStrictEqual(
      manifests,
      require('./fixtures/no-bump-commit.json')
    );
  });

  it('bumps nothing previous commit was a bump commit', function () {
    makeBumpCommit();
    runBumpVersion();
    const manifests = readAllManifests();

    assert.deepStrictEqual(
      manifests,
      require('./fixtures/last-commit-is-bump.json')
    );
  });

  it('bumps only a package without dependencies', function () {
    makeBumpCommit();
    commitPackageChange('package6', 'chore: some change');
    runBumpVersion();
    const manifests = readAllManifests();

    assert.deepStrictEqual(
      manifests,
      require('./fixtures/bump-package-without-deps.json')
    );
  });

  it('bumps a package with dependencies', function () {
    makeBumpCommit();
    commitPackageChange('package1', 'feat: some change');
    runBumpVersion();
    const manifests = readAllManifests();
    assert.deepStrictEqual(
      manifests,
      require('./fixtures/bump-package-1-feat.json')
    );
  });

  it('bumps a package with dependencies (major)', function () {
    makeBumpCommit();
    commitPackageChange('package1', 'feat: some change BREAKING CHANGE');
    runBumpVersion();
    const manifests = readAllManifests();
    assert.deepStrictEqual(
      manifests,
      require('./fixtures/bump-package-1-breaking.json')
    );
  });

  it('skips bumping packages listed in SKIP_BUMP_PACKAGES', function () {
    const skipBkp = process.env.SKIP_BUMP_PACKAGES;
    try {
      process.env.SKIP_BUMP_PACKAGES = 'package6';
      makeBumpCommit();
      commitPackageChange('package5', 'chore: some change');
      commitPackageChange('package6', 'chore: some change');
      runBumpVersion();
      const manifests = readAllManifests();
      assert.deepStrictEqual(
        manifests,
        require('./fixtures/skip-packages.json')
      );
    } finally {
      process.env.SKIP_BUMP_PACKAGES = skipBkp;
    }
  });

  it('skips bumping packages listed in SKIP_BUMP_PACKAGES, keeps other bumps', function () {
    const skipBkp = process.env.SKIP_BUMP_PACKAGES;
    try {
      process.env.SKIP_BUMP_PACKAGES = 'package5';
      makeBumpCommit();
      commitPackageChange('package5', 'chore: some change');
      commitPackageChange('package6', 'chore: some change');
      runBumpVersion();
      const manifests = readAllManifests();
      assert.deepStrictEqual(
        manifests,
        require('./fixtures/skip-packages-keep-unskipped.json')
      );
    } finally {
      process.env.SKIP_BUMP_PACKAGES = skipBkp;
    }
  });

  it('preserves caret ranges', function () {
    addPackage({
      name: 'package7',
      devDependencies: { package6: '^1.0.0' },
    });

    makeBumpCommit();
    commitPackageChange('package6', 'chore: some change');
    runBumpVersion();
    const manifests = readAllManifests();
    assert.deepStrictEqual(
      manifests,
      require('./fixtures/preserve-caret.json')
    );
  });

  it('preserves tilde ranges', function () {
    addPackage({
      name: 'package7',
      devDependencies: { package6: '~1.0.0' },
    });

    makeBumpCommit();
    commitPackageChange('package6', 'chore: some change');
    runBumpVersion();
    const manifests = readAllManifests();
    assert.deepStrictEqual(
      manifests,
      require('./fixtures/preserve-tilde.json')
    );
  });

  it('preserves star ranges', function () {
    addPackage({
      name: 'package7',
      devDependencies: { package6: '*' },
    });

    makeBumpCommit();
    commitPackageChange('package6', 'chore: some change');
    runBumpVersion();
    const manifests = readAllManifests();
    assert.deepStrictEqual(manifests, require('./fixtures/preserve-star.json'));
  });
});
