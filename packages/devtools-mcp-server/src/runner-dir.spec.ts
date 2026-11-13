import { expect } from 'chai';
import { resolveRunnerDir, DEFAULT_RUNNER_DIR } from './clusters';

describe('resolveRunnerDir', function () {
  const original = process.env.MONGODB_RUNNER_RUNNER_DIR;

  afterEach(function () {
    if (original === undefined) {
      delete process.env.MONGODB_RUNNER_RUNNER_DIR;
    } else {
      process.env.MONGODB_RUNNER_RUNNER_DIR = original;
    }
  });

  it("defaults to the mongodb-runner CLI's directory", function () {
    delete process.env.MONGODB_RUNNER_RUNNER_DIR;
    expect(resolveRunnerDir()).to.equal(DEFAULT_RUNNER_DIR);
  });

  it('honors MONGODB_RUNNER_RUNNER_DIR', function () {
    process.env.MONGODB_RUNNER_RUNNER_DIR = '/tmp/custom-runner';
    expect(resolveRunnerDir()).to.equal('/tmp/custom-runner');
  });
});
