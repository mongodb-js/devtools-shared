import { promises as fs, createReadStream } from 'fs';
import path from 'path';
import nock from 'nock';
import { expect } from 'chai';

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
  const bucketConfig: S3BucketConfig = {
    bucket: 'test',
    credentials: {
      accessKeyId: 'test-access-key',
      secretAccessKey: 'test-secret-key',
    },
    endpoint: 'http://s3.example.test',
    tls: false,
    forcePathStyle: true,
  };
  let downloadCenter: DownloadCenter;

  beforeEach(function () {
    nock.cleanAll();
    downloadCenter = new DownloadCenter({ ...bucketConfig });
  });

  afterEach(function () {
    try {
      expect(nock.isDone(), nock.pendingMocks().join('\n')).to.equal(true);
    } finally {
      nock.cleanAll();
    }
  });

  const fixturePath = (...args: string[]) =>
    path.resolve(__dirname, '..', 'fixtures', ...args);

  describe('upload / download assets', function () {
    it('can upload a file and download it back', async function () {
      const asset = await fs.readFile(fixturePath('asset.txt'), 'utf8');
      nock('http://s3.example.test', {
        reqheaders: { 'x-amz-acl': 'public-read' },
      })
        .put(
          '/test/prefix/asset.txt',
          (body) => typeof body === 'string' && body.includes(asset),
        )
        .query(true)
        .reply(200);
      nock('http://s3.example.test')
        .get('/test/prefix/asset.txt')
        .query(true)
        .reply(200, asset);

      await downloadCenter.uploadAsset(
        'prefix/asset.txt',
        createReadStream(fixturePath('asset.txt')),
      );

      const content = await downloadCenter.downloadAsset('prefix/asset.txt');
      expect(await content?.transformToString()).to.equal(asset);
    });

    it('can upload a file with private acls and download it back', async function () {
      const asset = await fs.readFile(fixturePath('asset.txt'), 'utf8');
      nock('http://s3.example.test', {
        reqheaders: { 'x-amz-acl': 'private' },
      })
        .put(
          '/test/prefix-private/asset.txt',
          (body) => typeof body === 'string' && body.includes(asset),
        )
        .query(true)
        .reply(200);
      nock('http://s3.example.test')
        .get('/test/prefix-private/asset.txt')
        .query(true)
        .reply(200, asset);

      await downloadCenter.uploadAsset(
        'prefix-private/asset.txt',
        createReadStream(fixturePath('asset.txt')),
        {
          acl: 'private',
        },
      );

      const content = await downloadCenter.downloadAsset(
        'prefix-private/asset.txt',
      );
      expect(await content?.transformToString()).to.equal(asset);
    });
  });

  describe('upload / download config', function () {
    it('can upload and download a valid config file', async function () {
      const validConfig = await readJSON<DownloadCenterConfig>(
        fixturePath('compass.json'),
      );
      nock('https://downloads.mongodb.com')
        .head('/compass/mongodb-compass-1.21.2-darwin-x64.dmg')
        .reply(200);
      nock('http://s3.example.test')
        .put('/test/prefix/compass.json', JSON.stringify(validConfig))
        .query(true)
        .reply(200)
        .get('/test/prefix/compass.json')
        .query(true)
        .reply(200, JSON.stringify(validConfig));

      await downloadCenter.uploadConfig('prefix/compass.json', validConfig);

      const config = await downloadCenter.downloadConfig('prefix/compass.json');
      expect(config).to.deep.equal(validConfig);
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
        'Invalid configuration: data/versions must be array',
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
      nock('http://example.com').head('/non-existing-url').reply(404);

      const error = await downloadCenter
        .uploadConfig('prefix/compass.json', invalidConfig)
        .catch((e) => e);
      expect(error.message).to.match(
        new RegExp(
          'Download center urls broken:\n' +
            '- http://example.com/non-existing-url -> [45][0-9][0-9]',
        ),
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
          'Invalid configuration: data must have' +
            " required property 'manual_link'",
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
              (e) => e,
            );

            expect(error).not.to.be.undefined;
            expect(error.message).to.equal(
              'Download center urls broken:\n' +
                '- https://downloads.mongodb.com/compass/mongosh-0.2.2-win32.zip -> 404\n' +
                '- https://downloads.mongodb.com/compass/mongosh_0.2.2_amd64.deb -> 404',
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
                downloadCenterJsonWithMultiplePackages,
              ),
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
            download_link: links.linux,
          });

          expect(probe1.ok).to.be.true;
          expect(probe1.status).to.equal(200);

          const probe2 = await probePlatformDownloadLink({
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
