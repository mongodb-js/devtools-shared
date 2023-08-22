import { promises as fs, createReadStream } from 'fs';
import path from 'path';
import os from 'os';
import nock from 'nock';
import { expect } from 'chai';
import S3rver from 's3rver';

import type { S3BucketConfig } from './download-center';
import {
  DownloadCenter,
  probePlatformDownloadLink,
  validateConfigSchema,
  validateDownloadLinks,
} from './download-center';
import type { DownloadCenterConfig } from './download-center-config';

const readJSON = <T>(filePath: string) =>
  fs
    .readFile(filePath, 'utf-8')
    .then(JSON.parse)
    .then((value) => value as T);

describe('download center client', function () {
  let tempDir: string;
  let bucketConfig: S3BucketConfig;
  let downloadCenter: DownloadCenter;

  let s3rver: S3rver;

  before(async function () {
    tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'download-center-tests-')
    );

    s3rver = new S3rver({
      address: '0.0.0.0',
      port: 0,
      silent: false,
      directory: tempDir,
      configureBuckets: [{ name: 'test', configs: [] }],
    });

    const addressInfo = await s3rver.run();

    bucketConfig = {
      bucket: 'test',
      accessKeyId: 'S3RVER',
      secretAccessKey: 'S3RVER',
      endpoint: `http://${addressInfo.address}:${addressInfo.port}`,
      sslEnabled: false,
      s3ForcePathStyle: true,
    };
  });

  after(function (done) {
    s3rver.close(done);
  });

  beforeEach(async function () {
    await fs.mkdir(tempDir, { recursive: true });
    await s3rver.configureBuckets();
    downloadCenter = new DownloadCenter({ ...bucketConfig });
  });

  afterEach(async function () {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const fixturePath = (...args: string[]) =>
    path.resolve(__dirname, '..', 'fixtures', ...args);

  describe('upload / download assets', function () {
    it('can upload a file and download it back', async function () {
      await downloadCenter.uploadAsset(
        'prefix/asset.txt',
        createReadStream(fixturePath('asset.txt'))
      );

      const content = await downloadCenter.downloadAsset('prefix/asset.txt');
      expect(content?.toString()).to.contain('content');
    });
  });

  describe('upload / download config', function () {
    it('can upload and download a valid config file', async function () {
      const validConfig = await readJSON<DownloadCenterConfig>(
        fixturePath('compass.json')
      );
      await downloadCenter.uploadConfig('prefix/compass.json', validConfig);

      const config = await downloadCenter.downloadConfig('prefix/compass.json');
      expect(config).has.property('manual_link');
    });

    it('rejects an invalid configuration (malformed)', async function () {
      const invalidConfig = {
        ...(await readJSON<any>(fixturePath('compass.json'))),
        versions: null,
      };

      const error = await downloadCenter
        .uploadConfig('prefix/compass.json', invalidConfig)
        .catch((e) => e);

      expect(error.message).equal(
        'Invalid configuration: data.versions should be array'
      );
    });

    it('rejects an invalid configuration (missing link)', async function () {
      const invalidConfig = {
        ...(await readJSON<DownloadCenterConfig>(fixturePath('compass.json'))),
        versions: [
          {
            _id: '1.21.2',
            version: '1.21.2 (Stable)',
            platform: [
              {
                arch: 'x64',
                os: 'darwin',
                name: 'OS X 64-bit (10.10+)',
                download_link: 'http://example.com/non-existing-url',
              },
            ],
          },
        ],
      };

      const error = await downloadCenter
        .uploadConfig('prefix/compass.json', invalidConfig)
        .catch((e) => e);

      expect(error.message).equal(
        'Download center urls broken:\n' +
          '- http://example.com/non-existing-url -> 404'
      );
    });
  });

  describe('validate-config', function () {
    const links = {
      darwin: 'https://downloads.mongodb.com/compass/mongosh-0.2.2-darwin.zip',
      darwin_dmg:
        'https://downloads.mongodb.com/compass/mongosh-0.2.2-darwin.dmg',
      win32: 'https://downloads.mongodb.com/compass/mongosh-0.2.2-win32.zip',
      linux: 'https://downloads.mongodb.com/compass/mongosh-0.2.2-linux.tgz',
      debian: 'https://downloads.mongodb.com/compass/mongosh_0.2.2_amd64.deb',
    };

    const downloadCenterJson = {
      versions: [
        {
          _id: '0.2.2',
          version: '0.2.2',
          platform: [
            {
              arch: 'x64',
              os: 'darwin',
              name: 'MacOS 64-bit (10.10+)',
              download_link: links.darwin,
            },
            {
              arch: 'x64',
              os: 'win32',
              name: 'Windows 64-bit (7+)',
              download_link: links.win32,
            },
            {
              arch: 'x64',
              os: 'linux',
              name: 'Linux 64-bit',
              download_link: links.linux,
            },
            {
              arch: 'x64',
              os: 'debian',
              name: 'Debian 64-bit',
              download_link: links.debian,
            },
          ],
        },
      ],
      manual_link: 'https://docs.mongodb.org/manual/products/mongosh',
      release_notes_link:
        'https://github.com/mongodb-js/mongosh/releases/tag/v0.2.2',
      previous_releases_link: '',
      development_releases_link: '',
      supported_browsers_link: '',
      tutorial_link: 'test',
    };

    const downloadCenterJsonWithMultiplePackages = {
      versions: [
        {
          _id: '0.2.2',
          version: '0.2.2',
          platform: [
            {
              arch: 'x64',
              os: 'darwin',
              packages: {
                links: [
                  {
                    download_link: links.darwin,
                    name: 'zip',
                  },
                  {
                    download_link: links.darwin_dmg,
                    name: 'dmg',
                  },
                ],
              },
            },
          ],
        },
      ],
      manual_link: 'https://docs.mongodb.org/manual/products/mongosh',
      release_notes_link:
        'https://github.com/mongodb-js/mongosh/releases/tag/v0.2.2',
      previous_releases_link: '',
      development_releases_link: '',
      supported_browsers_link: '',
      tutorial_link: 'test',
    };

    describe('validateConfigSchema', function () {
      it('does not throw with a valid config', function () {
        expect(() => {
          validateConfigSchema(downloadCenterJson);
        }).not.to.throw();
      });

      it('throws with a valid config', function () {
        const invalidConfig: any = {
          ...downloadCenterJson,
          manual_link: undefined,
        };

        expect(() => {
          validateConfigSchema(invalidConfig);
        }).to.throw(
          'Invalid configuration: data should have' +
            " required property 'manual_link'"
        );
      });
    });

    describe('validateConfigUrls', function () {
      function nockLink(link: string, status: number, headers = {}): void {
        const url = new URL(link);
        nock(url.origin).head(url.pathname).reply(status, undefined, headers);
      }

      describe('for single package per platform', function () {
        describe('when all links are correct', function () {
          beforeEach(function () {
            nock.cleanAll();
            nockLink(links.darwin, 302, {
              Location: 'http://example.com/redirect',
            });
            nockLink(links.win32, 200);
            nockLink(links.linux, 200);
            nockLink(links.debian, 200);
            nockLink('http://example.com/redirect', 200);
          });

          afterEach(function () {
            if (!nock.isDone()) {
              throw new Error('HTTP calls to link urls were not done');
            }
          });

          it('does not throw if all the downloads are ok', async function () {
            expect(await validateDownloadLinks(downloadCenterJson)).to.be
              .undefined;
          });
        });

        describe('with broken links', function () {
          beforeEach(function () {
            nock.cleanAll();
            nockLink(links.darwin, 200);
            nockLink(links.win32, 302, {
              Location: 'http://example.com/redirect',
            });
            nockLink(links.linux, 200);
            nockLink(links.debian, 404);
            nockLink('http://example.com/redirect', 404);
          });

          afterEach(function () {
            if (!nock.isDone()) {
              throw new Error('HTTP calls to link urls were not done');
            }
          });

          it('throws reporting broken urls', async function () {
            const error = await validateDownloadLinks(downloadCenterJson).catch(
              (e) => e
            );

            expect(error).not.to.be.undefined;
            expect(error.message).to.equal(
              'Download center urls broken:\n' +
                '- https://downloads.mongodb.com/compass/mongosh-0.2.2-win32.zip -> 404\n' +
                '- https://downloads.mongodb.com/compass/mongosh_0.2.2_amd64.deb -> 404'
            );
          });
        });
      });

      describe('for multiple packages per platform', function () {
        describe('when all links are correct', function () {
          beforeEach(function () {
            nock.cleanAll();
            nockLink(links.darwin, 302, {
              Location: 'http://example.com/redirect',
            });
            nockLink(links.darwin_dmg, 200);
            nockLink('http://example.com/redirect', 200);
          });

          afterEach(function () {
            if (!nock.isDone()) {
              throw new Error('HTTP calls to link urls were not done');
            }
          });

          it('does not throw if all the downloads are ok', async function () {
            expect(
              await validateDownloadLinks(
                downloadCenterJsonWithMultiplePackages
              )
            ).to.be.undefined;
          });
        });
      });

      describe('probePlatformDownloadLink', function () {
        beforeEach(function () {
          nock.cleanAll();
          nockLink(links.linux, 200);
          nockLink(links.debian, 404);
        });

        afterEach(function () {
          if (!nock.isDone()) {
            throw new Error('HTTP calls to link urls were not done');
          }
        });

        it('returns the result of the probe', async function () {
          const probe1 = await probePlatformDownloadLink({
            arch: 'x64',
            os: 'linux',
            name: 'Linux 64-bit',
            download_link: links.linux,
          });

          expect(probe1.ok).to.be.true;
          expect(probe1.status).to.equal(200);

          const probe2 = await probePlatformDownloadLink({
            arch: 'x64',
            os: 'debian',
            name: 'Debian 64-bit',
            download_link: links.debian,
          });

          expect(probe2.ok).to.be.false;
          expect(probe2.status).to.equal(404);
        });
      });

      after(nock.restore);
    });
  });
});
