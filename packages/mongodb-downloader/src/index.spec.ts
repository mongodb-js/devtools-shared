import { expect } from 'chai';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { Readable } from 'stream';
import sinon from 'sinon';
import { S3Client } from '@aws-sdk/client-s3';
import { MongoDBDownloader } from '.';

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
        expectedVersion: '8.1.0',
        expectedVersionName: '8.1.0-enterprise',
        expectedEnterpriseFlag: true,
      },
      {
        version: '8.1.0-enterprise',
        enterprise: false,
        expectedVersion: '8.1.0',
        expectedVersionName: '8.1.0-enterprise',
        expectedEnterpriseFlag: true,
      },
      {
        version: '8.1.0-enterprise',
        enterprise: true,
        expectedVersion: '8.1.0',
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

  describe('s3 downloads', function () {
    const s3Url =
      's3://origin-mongodb-server-latest/server-latest/mongodb-mongo-master-nightly/mongodb-linux-x86_64-enterprise-ubuntu2204-latest.tgz';
    const awsEnvKeys = [
      'AWS_REGION',
      'AWS_DEFAULT_REGION',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'AWS_SESSION_TOKEN',
      'AWS_EC2_METADATA_DISABLED',
      'AWS_SHARED_CREDENTIALS_FILE',
      'AWS_CONFIG_FILE',
      'AWS_PROFILE',
      'AWS_DEFAULT_PROFILE',
    ] as const;
    let savedEnv: Record<string, string | undefined>;

    type OpenDownloadStream = (url: string) => Promise<{
      body: Readable;
      totalBytes: number | null;
    }>;

    function openDownloadStream(url: string): Promise<{
      body: Readable;
      totalBytes: number | null;
    }> {
      return (
        testDownloader as unknown as {
          openDownloadStream: OpenDownloadStream;
        }
      ).openDownloadStream(url);
    }

    async function captureError(
      promise: Promise<unknown>,
    ): Promise<Error | undefined> {
      try {
        await promise;
      } catch (err) {
        return err as Error;
      }
      return undefined;
    }

    function disableLocalAwsConfig(): void {
      process.env.AWS_EC2_METADATA_DISABLED = 'true';
      process.env.AWS_SHARED_CREDENTIALS_FILE = path.join(
        directory,
        'missing-credentials',
      );
      process.env.AWS_CONFIG_FILE = path.join(directory, 'missing-config');
    }

    beforeEach(function () {
      savedEnv = {};
      for (const key of awsEnvKeys) {
        savedEnv[key] = process.env[key];
        delete process.env[key];
      }
    });

    afterEach(function () {
      for (const key of awsEnvKeys) {
        const value = savedEnv[key];
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    });

    it('fails with an actionable message when credentials are absent', async function () {
      process.env.AWS_REGION = 'us-east-1';
      disableLocalAwsConfig();

      const error = await captureError(openDownloadStream(s3Url));

      expect(error?.message).to.match(/credentials/i);
      expect(error?.message).to.match(/access/i);
    });

    it('fails with an actionable message when the region is absent', async function () {
      process.env.AWS_ACCESS_KEY_ID = 'access-key-id';
      process.env.AWS_SECRET_ACCESS_KEY = 'secret-access-key';
      disableLocalAwsConfig();

      const error = await captureError(openDownloadStream(s3Url));

      expect(error?.message).to.match(/region/i);
    });

    it('propagates non-credential errors unchanged', async function () {
      const accessDenied = new Error('Access Denied');
      accessDenied.name = 'AccessDenied';
      const sendStub = sinon.stub(
        S3Client.prototype,
        'send',
      ) as sinon.SinonStub;
      sendStub.rejects(accessDenied);

      try {
        const error = await captureError(openDownloadStream(s3Url));

        expect(error).to.equal(accessDenied);
      } finally {
        sendStub.restore();
      }
    });

    it('downloads using the bucket and key from the s3 URL', async function () {
      const body = Readable.from('tarball');
      const sendStub = sinon.stub(
        S3Client.prototype,
        'send',
      ) as sinon.SinonStub;
      sendStub.resolves({ Body: body, ContentLength: 7 });

      try {
        const result = await openDownloadStream(s3Url);

        expect(sendStub).to.have.been.calledOnce;
        const command = sendStub.firstCall.args[0] as {
          input: { Bucket: string; Key: string };
        };
        expect(command.input.Bucket).to.equal('origin-mongodb-server-latest');
        expect(command.input.Key).to.equal(
          'server-latest/mongodb-mongo-master-nightly/mongodb-linux-x86_64-enterprise-ubuntu2204-latest.tgz',
        );
        expect(result.body).to.equal(body);
        expect(result.totalBytes).to.equal(7);
      } finally {
        sendStub.restore();
      }
    });
  });
});
