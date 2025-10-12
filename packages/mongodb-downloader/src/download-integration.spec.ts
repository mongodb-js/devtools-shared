import { expect } from 'chai';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { MongoDbDownloader } from './index';

describe('downloader with Locking', function () {
  this.timeout(60000);

  let tmpDir: string;

  beforeEach(async function () {
    tmpDir = path.join(os.tmpdir(), `download-integration-tests-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });
  });
  const version = '8.2.0';

  afterEach(async function () {
    try {
      await fs.rm(tmpDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should prevent concurrent downloads of the same version', async function () {
    const downloader = new MongoDbDownloader({ tmpdir: tmpDir });

    const results = await Promise.all([
      downloader.downloadMongoDbWithVersionInfo(version),
      downloader.downloadMongoDbWithVersionInfo(version),
      downloader.downloadMongoDbWithVersionInfo(version),
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
    const downloader = new MongoDbDownloader({ tmpdir: tmpDir });
    const result = await downloader.downloadMongoDbWithVersionInfo(version);

    expect(result.version).to.equal(version);
    expect(result.downloadedBinDir).to.be.a('string');

    // Verify the downloaded directory exists and contains mongod
    expect(await fs.stat(result.downloadedBinDir)).to.be.ok;
    expect(await fs.stat(path.join(result.downloadedBinDir, 'mongod'))).to.be
      .ok;
  });

  it('should skip download if already completed', async function () {
    // First download
    const downloader = new MongoDbDownloader({ tmpdir: tmpDir });
    const result1 = await downloader.downloadMongoDbWithVersionInfo(version);

    // Second download should use cached result
    const result2 = await downloader.downloadMongoDbWithVersionInfo(version);

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
    const downloader = new MongoDbDownloader({ tmpdir: tmpDir });
    const [result1, result2] = await Promise.all([
      downloader.downloadMongoDbWithVersionInfo(version),
      downloader.downloadMongoDbWithVersionInfo(version2),
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

  it('should handle promise caching correctly', async function () {
    const version = '8.2.0';

    // Start multiple downloads in sequence (not parallel)
    const downloader = new MongoDbDownloader({ tmpdir: tmpDir });
    const result1 = await downloader.downloadMongoDbWithVersionInfo(version);
    const result2 = await downloader.downloadMongoDbWithVersionInfo(version);
    const result3 = await downloader.downloadMongoDbWithVersionInfo(version);

    // All should return the same result
    expect(result1.version).to.equal(version);
    expect(result2.version).to.equal(version);
    expect(result3.version).to.equal(version);

    expect(result1.downloadedBinDir).to.equal(result2.downloadedBinDir);
    expect(result2.downloadedBinDir).to.equal(result3.downloadedBinDir);

    // Verify the downloaded directory exists and contains mongod
    expect(await fs.stat(result1.downloadedBinDir)).to.be.ok;
    expect(await fs.stat(path.join(result1.downloadedBinDir, 'mongod'))).to.be
      .ok;
  });
});
