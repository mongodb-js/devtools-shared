import chai, { expect } from 'chai';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { MongoDBDownloader } from '.';

chai.use(sinonChai);

describe('MongoDBDownloader', function () {
  this.timeout(60_000);

  let directory: string;
  let testDownloader: MongoDBDownloader;
  let downloadAndExtractStub: sinon.SinonStub;
  let lookupDownloadUrlStub: sinon.SinonStub;

  beforeEach(async function () {
    directory = path.join(
      os.tmpdir(),
      `download-integration-tests-${Date.now()}`,
    );
    await fs.mkdir(directory, { recursive: true });

    // Create a test instance of the downloader
    testDownloader = new MongoDBDownloader();

    // Mock the downloadAndExtract method to avoid actual downloads
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    downloadAndExtractStub = sinon
      .stub(testDownloader as any, 'downloadAndExtract')
      .callsFake(async (...args: any[]) => {
        // Create the bindir and a fake mongod executable
        const params = args[0] as {
          bindir: string;
          url: string;
          downloadTarget: string;
          isCryptLibrary: boolean;
        };
        await fs.mkdir(params.bindir, { recursive: true });
        await fs.writeFile(
          path.join(params.bindir, 'mongod'),
          '#!/bin/bash\necho "This is a mock mongod"',
        );
      });

    // Mock the lookupDownloadUrl method to avoid network calls
    lookupDownloadUrlStub = sinon
      .stub(testDownloader as any, 'lookupDownloadUrl')
      .resolves({
        version: '8.2.0',
        url: 'https://example.com/mongodb-8.2.0.tgz',
        name: 'mongodb-8.2.0',
      });
  });
  const version = '8.2.0';

  afterEach(async function () {
    // Restore stubs
    downloadAndExtractStub.restore();
    lookupDownloadUrlStub.restore();

    try {
      await fs.rm(directory, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('without lockfile', function () {
    it('should download multiple times in parallel', async function () {
      const results = await Promise.all([
        testDownloader.downloadMongoDbWithVersionInfo({
          directory,
          version,
          useLockfile: false,
        }),
        testDownloader.downloadMongoDbWithVersionInfo({
          directory,
          version,
          useLockfile: false,
        }),
        testDownloader.downloadMongoDbWithVersionInfo({
          directory,
          version,
          useLockfile: false,
        }),
      ]);
      expect(results[0].version).to.equal(version);
      expect(results[0].downloadedBinDir).to.be.a('string');

      expect(downloadAndExtractStub).to.have.callCount(3);
    });

    it('should skip download if already completed sequentially', async function () {
      const result = await testDownloader.downloadMongoDbWithVersionInfo({
        directory,
        version,
        useLockfile: false,
      });

      const result2 = await testDownloader.downloadMongoDbWithVersionInfo({
        directory,
        version,
        useLockfile: false,
      });
      expect(result2.version).to.equal(version);
      expect(result2.downloadedBinDir).to.equal(result.downloadedBinDir);

      expect(downloadAndExtractStub).to.have.been.calledOnce;
    });

    it('should handle different versions independently', async function () {
      const version2 = '8.1.0';

      // Update stub to return different version info for the second call
      lookupDownloadUrlStub.onSecondCall().resolves({
        version: '8.1.0',
        url: 'https://example.com/mongodb-8.1.0.tgz',
        name: 'mongodb-8.1.0',
      });

      // Download different versions
      const [result1, result2] = await Promise.all([
        testDownloader.downloadMongoDbWithVersionInfo({
          directory,
          version,
          useLockfile: false,
        }),
        testDownloader.downloadMongoDbWithVersionInfo({
          directory,
          version: version2,
          useLockfile: false,
        }),
      ]);

      expect(result1.version).to.not.equal(result2.version);
      expect(result1.downloadedBinDir).to.not.equal(result2.downloadedBinDir);

      // Verify both downloaded directories exist and contain mongod
      expect(await fs.stat(result1.downloadedBinDir)).to.be.ok;
      expect(await fs.stat(path.join(result1.downloadedBinDir, 'mongod'))).to.be
        .ok;
      expect(await fs.stat(result2.downloadedBinDir)).to.be.ok;
      expect(await fs.stat(path.join(result2.downloadedBinDir, 'mongod'))).to.be
        .ok;

      // Verify downloadAndExtract was called twice (once for each version)
      expect(downloadAndExtractStub).to.have.been.calledTwice;
    });
  });

  describe('with lockfile', function () {
    it('should prevent concurrent downloads of the same version', async function () {
      const results = await Promise.all([
        testDownloader.downloadMongoDbWithVersionInfo({
          directory,
          version,
          useLockfile: true,
        }),
        testDownloader.downloadMongoDbWithVersionInfo({
          directory,
          version,
          useLockfile: true,
        }),
        testDownloader.downloadMongoDbWithVersionInfo({
          directory,
          version,
          useLockfile: true,
        }),
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

      // Verify downloadAndExtract was called only once despite 3 concurrent requests
      expect(downloadAndExtractStub).to.have.been.calledOnce;
    });

    it('should wait for existing download to complete', async function () {
      // First, download MongoDB normally
      const result = await testDownloader.downloadMongoDbWithVersionInfo({
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

      // Verify downloadAndExtract was called once
      expect(downloadAndExtractStub).to.have.been.calledOnce;
    });

    it('should skip download if already completed', async function () {
      // First download
      const result1 = await testDownloader.downloadMongoDbWithVersionInfo({
        directory,
        version,
        useLockfile: true,
      });

      // Second download should use cached result
      const result2 = await testDownloader.downloadMongoDbWithVersionInfo({
        directory,
        version,
        useLockfile: true,
      });

      expect(result1.version).to.equal(version);
      expect(result2.version).to.equal(version);

      // Verify the downloaded directory exists and contains mongod
      expect(await fs.stat(result1.downloadedBinDir)).to.be.ok;
      expect(await fs.stat(path.join(result1.downloadedBinDir, 'mongod'))).to.be
        .ok;

      // Verify downloadAndExtract was called only once, not twice
      expect(downloadAndExtractStub).to.have.been.calledOnce;
    });

    it('should handle different versions independently', async function () {
      const version2 = '8.1.0';

      // Update stub to return different version info for the second call
      lookupDownloadUrlStub.onSecondCall().resolves({
        version: '8.1.0',
        url: 'https://example.com/mongodb-8.1.0.tgz',
        name: 'mongodb-8.1.0',
      });

      // Download different versions
      const [result1, result2] = await Promise.all([
        testDownloader.downloadMongoDbWithVersionInfo({
          directory,
          version,
          useLockfile: true,
        }),
        testDownloader.downloadMongoDbWithVersionInfo({
          directory,
          version: version2,
          useLockfile: true,
        }),
      ]);

      expect(result1.version).to.not.equal(result2.version);
      expect(result1.downloadedBinDir).to.not.equal(result2.downloadedBinDir);

      // Verify both downloaded directories exist and contain mongod
      expect(await fs.stat(result1.downloadedBinDir)).to.be.ok;
      expect(await fs.stat(path.join(result1.downloadedBinDir, 'mongod'))).to.be
        .ok;
      expect(await fs.stat(result2.downloadedBinDir)).to.be.ok;
      expect(await fs.stat(path.join(result2.downloadedBinDir, 'mongod'))).to.be
        .ok;

      // Verify downloadAndExtract was called twice (once for each version)
      expect(downloadAndExtractStub).to.have.been.calledTwice;
    });
  });

  describe('version name', function () {
    for (const {
      version,
      enterprise,
      expectedVersion,
      expectedVersionName,
      expectedEnterpriseFlag,
    } of [
      {
        version: '8.1.0',
        enterprise: undefined,
        expectedVersion: '8.1.0',
        expectedVersionName: '8.1.0-community',
        expectedEnterpriseFlag: false,
      },
      {
        version: '8.1.0',
        enterprise: false,
        expectedVersion: '8.1.0',
        expectedVersionName: '8.1.0-community',
        expectedEnterpriseFlag: false,
      },
      {
        version: '8.1.0',
        enterprise: true,
        expectedVersion: '8.1.0',
        expectedVersionName: '8.1.0-enterprise',
        expectedEnterpriseFlag: true,
      },
      {
        version: '8.1.0-enterprise',
        enterprise: undefined,
        expectedVersion: '8.1.0-enterprise',
        expectedVersionName: '8.1.0',
        expectedEnterpriseFlag: true,
      },
      {
        version: '8.1.0-enterprise',
        enterprise: false,
        expectedVersion: '8.1.0-enterprise',
        expectedVersionName: '8.1.0-enterprise',
        expectedEnterpriseFlag: true,
      },
      {
        version: '8.1.0-enterprise',
        enterprise: true,
        expectedVersion: '8.1.0-enterprise',
        expectedVersionName: '8.1.0-enterprise',
        expectedEnterpriseFlag: true,
      },
      {
        version: 'latest-alpha',
        enterprise: undefined,
        expectedVersion: 'latest-alpha',
        expectedVersionName: 'latest-alpha',
        expectedEnterpriseFlag: false,
      },
      {
        version: 'latest-alpha',
        enterprise: true,
        expectedVersion: 'latest-alpha',
        expectedVersionName: 'latest-alpha',
        expectedEnterpriseFlag: true,
      },
      {
        version: '7.0.5',
        enterprise: false,
        expectedVersion: '7.0.5',
        expectedVersionName: '7.0.5-community',
        expectedEnterpriseFlag: false,
      },
      {
        version: '8.1.0-rc0',
        enterprise: false,
        expectedVersion: '8.1.0-rc0',
        expectedVersionName: '8.1.0-rc0-community',
        expectedEnterpriseFlag: false,
      },
    ]) {
      it(`should resolve correct version for ${version} with enterprise=${String(enterprise)}`, async function () {
        lookupDownloadUrlStub.resetHistory();

        const opts: {
          directory: string;
          version: string;
          useLockfile: boolean;
          downloadOptions?: { enterprise: boolean };
        } = {
          directory,
          version,
          useLockfile: false,
        };

        if (enterprise !== undefined) {
          opts.downloadOptions = { enterprise: enterprise };
        }

        const result =
          await testDownloader.downloadMongoDbWithVersionInfo(opts);

        // Verify lookup call
        expect(lookupDownloadUrlStub).to.have.been.calledOnce;

        const callArgs = lookupDownloadUrlStub.firstCall.args[0];
        expect(callArgs.targetVersion).to.equal(expectedVersion);
        expect(callArgs.enterprise).to.equal(expectedEnterpriseFlag);

        // Verify path contains expected string
        expect(result.downloadedBinDir).to.include(
          expectedVersionName.replaceAll('.', ''),
        );
      });
    }
  });
});
