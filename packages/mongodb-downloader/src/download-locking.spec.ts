import { expect } from 'chai';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { downloadMongoDbWithVersionInfo } from '.';

describe('downloader with locking', function () {
  this.timeout(60_000);

  let directory: string;

  beforeEach(async function () {
    directory = path.join(
      os.tmpdir(),
      `download-integration-tests-${Date.now()}`,
    );
    await fs.mkdir(directory, { recursive: true });
  });
  const version = '8.2.0';

  afterEach(async function () {
    try {
      await fs.rm(directory, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should prevent concurrent downloads of the same version', async function () {
    const results = await Promise.all([
      downloadMongoDbWithVersionInfo({ directory, version, useLockfile: true }),
      downloadMongoDbWithVersionInfo({ directory, version, useLockfile: true }),
      downloadMongoDbWithVersionInfo({ directory, version, useLockfile: true }),
    ]);

    // All results should be identical
    expect(results[0].version).to.equal(version);
    expect(results[1].version).to.equal(version);
    expect(results[2].version).to.equal(version);

    expect(results[0].downloadedBinDir).to.equal(results[1].downloadedBinDir);
    expect(results[1].downloadedBinDir).to.equal(results[2].downloadedBinDir);

    // Verify the downloaded directory exists and contains mongod
    expect(await fs.stat(results[0].downloadedBinDir)).to.be.ok;
    expect(await fs.stat(path.join(results[0].downloadedBinDir, 'mongod'))).to
      .be.ok;
  });

  it('should wait for existing download to complete', async function () {
    // First, download MongoDB normally
    const result = await downloadMongoDbWithVersionInfo({
      directory,
      version,
      useLockfile: true,
    });

    expect(result.version).to.equal(version);
    expect(result.downloadedBinDir).to.be.a('string');

    // Verify the downloaded directory exists and contains mongod
    expect(await fs.stat(result.downloadedBinDir)).to.be.ok;
    expect(await fs.stat(path.join(result.downloadedBinDir, 'mongod'))).to.be
      .ok;
  });

  it('should skip download if already completed', async function () {
    // First download
    const result1 = await downloadMongoDbWithVersionInfo({
      directory,
      version,
      useLockfile: true,
    });

    // Second download should use cached result
    const result2 = await downloadMongoDbWithVersionInfo({
      directory,
      version,
      useLockfile: true,
    });

    expect(result1.version).to.equal(version);
    expect(result2.version).to.equal(version);
    expect(result1.downloadedBinDir).to.equal(result2.downloadedBinDir);

    // Verify the downloaded directory exists and contains mongod
    expect(await fs.stat(result1.downloadedBinDir)).to.be.ok;
    expect(await fs.stat(path.join(result1.downloadedBinDir, 'mongod'))).to.be
      .ok;
  });

  it('should handle different versions independently', async function () {
    const version2 = '8.1.0';

    // Download different versions
    const [result1, result2] = await Promise.all([
      downloadMongoDbWithVersionInfo({ directory, version, useLockfile: true }),
      downloadMongoDbWithVersionInfo({
        directory,
        version: version2,
        useLockfile: true,
      }),
    ]);

    expect(result1.version).to.equal(version);
    expect(result2.version).to.equal(version2);
    expect(result1.downloadedBinDir).to.not.equal(result2.downloadedBinDir);

    // Verify both downloaded directories exist and contain mongod
    expect(await fs.stat(result1.downloadedBinDir)).to.be.ok;
    expect(await fs.stat(path.join(result1.downloadedBinDir, 'mongod'))).to.be
      .ok;
    expect(await fs.stat(result2.downloadedBinDir)).to.be.ok;
    expect(await fs.stat(path.join(result2.downloadedBinDir, 'mongod'))).to.be
      .ok;
  });
});
