import assert from 'assert';
import fetch from 'node-fetch';
import { promises as fs } from 'fs';
import path from 'path';
import zlib from 'zlib';
import http from 'http';
import { once } from 'events';
import resolve, { Options, clearCache } from '../';

const kUnknownUrl = Symbol('kUnknownUrl');

async function verify(query: Options | string | undefined, expectedURL: string | typeof kUnknownUrl): Promise<void> {
  const res = await resolve(query);
  if (expectedURL !== kUnknownUrl) {
    assert.strictEqual(res.url, expectedURL);
  }

  const response = await fetch(res.url, { method: 'HEAD' });
  if (!response.ok) {
    throw new Error(`Failed to get url: ${res.url}: ${response.statusText}`);
  }
}

function withFakeDistro(distro) {
  let origDistroId;
  before(function() {
    origDistroId = process.env.DISTRO_ID;
    process.env.DISTRO_ID = distro;
  });
  after(function() {
    if (origDistroId) {
      process.env.DISTRO_ID = origDistroId;
    } else {
      delete process.env.DISTRO_ID;
    }
  });
}

describe('mongodb-download-url', function() {
  this.slow(10_000);
  this.timeout(20_000);

  before(async function() {
    await clearCache();
  });

  describe('linux', function() {
    it('should resolve 2.4.14', async function() {
      const query = {
        version: '2.4.14',
        platform: 'linux',
        bits: 64
      } as const;
      await verify(query, 'https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-2.4.14.tgz');
    });

    it('should resolve 2.6.11', async function() {
      const query = {
        version: '2.6.11',
        platform: 'linux',
        bits: 64
      } as const;
      await verify(query, 'https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-2.6.11.tgz');
    });

    it('should resolve 3.1.9 enterprise', async function() {
      const query = {
        version: '3.1.9',
        platform: 'linux',
        distro: 'ubuntu1404',
        enterprise: true,
        bits: 64
      } as const;
      await verify(query, 'https://downloads.mongodb.com/linux/mongodb-linux-x86_64-enterprise-ubuntu1404-3.1.9.tgz');
    });

    it('should resolve 5.0.2 enterprise cryptd-only on Linux', async function() {
      const query = {
        version: '5.0.2',
        platform: 'linux',
        distro: 'ubuntu2004',
        enterprise: true,
        cryptd: true,
        bits: 64
      } as const;
      await verify(query, 'https://downloads.mongodb.com/linux/mongodb-cryptd-linux-x86_64-enterprise-ubuntu2004-5.0.2.tgz');
    });

    it('should resolve 5.0.2 enterprise cryptd-only on Windows', async function() {
      const query = {
        version: '5.0.2',
        platform: 'windows',
        distro: 'windows',
        enterprise: true,
        cryptd: true,
        bits: 64
      } as const;
      await verify(query, 'https://downloads.mongodb.com/windows/mongodb-cryptd-windows-x86_64-enterprise-5.0.2.zip');
    });

    it('should resolve 6.0.1 enterprise csfle-only on Linux', async function() {
      const query = {
        version: '6.0.1',
        platform: 'linux',
        distro: 'ubuntu2004',
        enterprise: true,
        csfle: true,
        bits: 64
      } as const;
      await verify(query, 'https://downloads.mongodb.com/linux/mongo_crypt_shared_v1-linux-x86_64-enterprise-ubuntu2004-6.0.1.tgz');
    });

    it('should resolve 6.0.1 enterprise csfle-only on Windows', async function() {
      const query = {
        version: '6.0.1',
        platform: 'windows',
        distro: 'windows',
        enterprise: true,
        csfle: true,
        bits: 64
      } as const;
      await verify(query, 'https://downloads.mongodb.com/windows/mongo_crypt_shared_v1-windows-x86_64-enterprise-6.0.1.zip');
    });

    it('should resolve 3.0.7 (32-bit)', async function() {
      const query = {
        version: '3.0.7',
        platform: 'linux',
        bits: 32
      } as const;
      await verify(query, 'https://fastdl.mongodb.org/linux/mongodb-linux-i686-3.0.7.tgz');
    });

    describe('ubuntu 18.04', function() {
      withFakeDistro('ubuntu1804');

      it('should resolve 4.2.0-rc1 with ubuntu-specific url', async function() {
        const query = {
          version: '4.2.0-rc1',
          platform: 'linux',
          bits: 64
        } as const;

        await verify(query, 'https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-ubuntu1804-4.2.0-rc1.tgz');
      });

      it('should resolve 4.0.0 with ubuntu-specific url and fallback to an older version of ubuntu', async function() {
        const query = {
          version: '4.0.0',
          platform: 'linux',
          bits: 64
        } as const;

        await verify(query, 'https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-ubuntu1604-4.0.0.tgz');
      });

      it('should resolve 3.6.0 with ubuntu-specific url and fallback to an older version of ubuntu', async function() {
        const query = {
          version: '3.6.0',
          platform: 'linux',
          bits: 64
        } as const;

        await verify(query, 'https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-ubuntu1604-3.6.0.tgz');
      });

      it('should resolve 2.6.11 with generic linux url', async function() {
        const query = {
          version: '2.6.11',
          platform: 'linux',
          bits: 64
        } as const;
        await verify(query, 'https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-2.6.11.tgz');
      });
    });

    describe('ubuntu 20.04', function() {
      withFakeDistro('ubuntu2004');

      it('should resolve * with ubuntu-specific url', async function() {
        const query = {
          version: '*',
          platform: 'linux'
        };

        await verify(query, kUnknownUrl);
      });

      it('should resolve 4.4.4 with ubuntu-specific url', async function() {
        const query = {
          version: '4.4.4',
          platform: 'linux',
          bits: 64
        } as const;

        await verify(query, 'https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-ubuntu2004-4.4.4.tgz');
      });

      it('should resolve 4.2.3 with ubuntu-specific url', async function() {
        const query = {
          version: '4.2.3',
          platform: 'linux',
          bits: 64
        } as const;

        await verify(query, 'https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-ubuntu1804-4.2.3.tgz');
      });

      it('should resolve 4.4.0 with ubuntu-specific url for arm', async function() {
        const query = {
          version: '4.4.0',
          platform: 'linux',
          arch: 'arm64'
        };

        await verify(query, 'https://fastdl.mongodb.org/linux/mongodb-linux-aarch64-ubuntu2004-4.4.0.tgz');
      });

      it('should resolve 6.2.0 as a continuous release', async function() {
        const query = {
          version: '>= 6.1 <= 6.2.0',
          platform: 'linux',
          arch: 'arm64',
          allowedTags: ['production_release', 'continuous_release']
        } as const;

        await verify(query, 'https://fastdl.mongodb.org/linux/mongodb-linux-aarch64-ubuntu2004-6.2.0.tgz');
      });
    });

    describe('sunos', function() {
      it('should resolve 3.5.8 with sunos-specific url', async function() {
        const query = {
          version: '3.5.8',
          platform: 'sunos',
          bits: 64
        } as const;

        await verify(query, 'https://fastdl.mongodb.org/sunos5/mongodb-sunos5-x86_64-3.5.8.tgz');
      });
    });

    describe('suse 12', function() {
      withFakeDistro('suse12');

      it('should resolve 4.4.0 with suse-specific url', async function() {
        const query = {
          version: '4.4.0',
          platform: 'linux',
          bits: 64
        } as const;

        await verify(query, 'https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-suse12-4.4.0.tgz');
      });
    });

    describe('suse 15', function() {
      withFakeDistro('suse15');

      it('should resolve 4.4.0 with suse-specific url', async function() {
        const query = {
          version: '4.4.0',
          platform: 'linux',
          bits: 64
        } as const;

        await verify(query, 'https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-suse15-4.4.0.tgz');
      });
    });

    describe('suse 15', function() {
      withFakeDistro('suse15sp4');

      it('should resolve 4.4.0 with suse-specific url', async function() {
        const query = {
          version: '4.4.0',
          platform: 'linux',
          bits: 64
        } as const;

        await verify(query, 'https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-suse15-4.4.0.tgz');
      });
    });

    describe('RHEL 7.7', function() {
      withFakeDistro('rhel77');

      it('should resolve 7.0.14 with RHEL-specific url', async function() {
        const query = {
          version: '7.0.14',
          platform: 'linux',
          bits: 64
        } as const;

        await verify(query, 'https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-rhel70-7.0.14.tgz');
      });

      it('should resolve 4.4.0 with RHEL-specific url', async function() {
        const query = {
          version: '4.4.0',
          platform: 'linux',
          bits: 64
        } as const;

        await verify(query, 'https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-rhel70-4.4.0.tgz');
      });
    });

    describe('RHEL 8.3', function() {
      withFakeDistro('rhel83');

      it('should resolve 7.0.14 with new schema RHEL-specific url', async function() {
        const query = {
          version: '7.0.14',
          platform: 'linux',
          bits: 64
        } as const;

        await verify(query, 'https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-rhel8-7.0.14.tgz');
      });
    });

    describe('RHEL 8.0', function() {
      withFakeDistro('rhel80');

      it('should resolve 6.0.17 with new schema RHEL-specific url', async function() {
        const query = {
          version: '6.0.17',
          platform: 'linux',
          bits: 64
        } as const;

        await verify(query, 'https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-rhel8-6.0.17.tgz');
      });

      it('should resolve 6.0.16 with old schema RHEL-specific url', async function() {
        const query = {
          version: '6.0.16',
          platform: 'linux',
          bits: 64
        } as const;

        await verify(query, 'https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-rhel80-6.0.16.tgz');
      });
    });

    describe('RHEL 5.5', function() {
      withFakeDistro('rhel55');

      it('should resolve 3.0.0 with RHEL-specific url', async function() {
        const query = {
          version: '3.0.0',
          platform: 'linux',
          bits: 64
        } as const;

        await verify(query, 'https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-rhel55-3.0.0.tgz');
      });
    });

    describe('RHEL 7', function() {
      withFakeDistro('rhel7');

      it('should resolve 7.2 with RHEL-specific url', async function() {
        const query = {
          platform: 'linux',
          arch: 's390x',
          enterprise: true,
          version: '6.0.19'
        } as const;

        await verify(query, 'https://downloads.mongodb.com/linux/mongodb-linux-s390x-enterprise-rhel72-6.0.19.tgz');
      });
    });

    describe('RHEL 8', function() {
      withFakeDistro('rhel8');

      it('should resolve zseries with RHEL8.3-specific url', async function() {
        const query = {
          platform: 'linux',
          arch: 's390x',
          enterprise: true,
          version: '6.0.19'
        } as const;

        // We don't have zseries release tagged as rhel8, so this should fallback to rhel83 as the latest one
        await verify(query, 'https://downloads.mongodb.com/linux/mongodb-linux-s390x-enterprise-rhel83-6.0.19.tgz');
      });

      it('should resolve x64 with RHEL8-specific url', async function() {
        const query = {
          platform: 'linux',
          enterprise: true,
          version: '6.0.19',
          bits: 64
        } as const;

        await verify(query, 'https://downloads.mongodb.com/linux/mongodb-linux-x86_64-enterprise-rhel8-6.0.19.tgz');
      });
    });

    describe('debian 9.2', function() {
      withFakeDistro('debian92');

      it('should resolve 4.4.4 with debian-specific url', async function() {
        const query = {
          version: '4.4.4',
          platform: 'linux',
          bits: 64
        } as const;

        await verify(query, 'https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-debian92-4.4.4.tgz');
      });

      it('should resolve 4.0.0 with debian-specific url', async function() {
        const query = {
          version: '4.0.0',
          platform: 'linux',
          bits: 64
        } as const;

        await verify(query, 'https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-debian92-4.0.0.tgz');
      });

      it('should resolve 3.6.0 with debian-specific url', async function() {
        const query = {
          version: '3.6.0',
          platform: 'linux',
          bits: 64
        } as const;

        await verify(query, 'https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-debian81-3.6.0.tgz');
      });

      it('should resolve 2.6.11 with generic linux url', async function() {
        const query = {
          version: '2.6.11',
          platform: 'linux',
          bits: 64
        } as const;
        await verify(query, 'https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-2.6.11.tgz');
      });
    });

    describe('debian 10', function() {
      withFakeDistro('debian10');

      it('should resolve 4.4.4 with debian-specific url', async function() {
        const query = {
          version: '4.4.4',
          platform: 'linux',
          bits: 64
        } as const;

        await verify(query, 'https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-debian10-4.4.4.tgz');
      });

      it('should resolve 4.2.1 with debian-specific url', async function() {
        const query = {
          version: '4.2.1',
          platform: 'linux',
          bits: 64
        } as const;

        await verify(query, 'https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-debian10-4.2.1.tgz');
      });

      it('should resolve 4.1.1 with debian-specific url', async function() {
        const query = {
          version: '4.1.1',
          platform: 'linux',
          bits: 64
        } as const;

        await verify(query, 'https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-debian92-4.1.1.tgz');
      });

      it('should resolve 3.6.0 with debian-specific url', async function() {
        const query = {
          version: '3.6.0',
          platform: 'linux',
          bits: 64
        } as const;

        await verify(query, 'https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-debian81-3.6.0.tgz');
      });

      it('should resolve 2.6.11 with generic linux url', async function() {
        const query = {
          version: '2.6.11',
          platform: 'linux',
          bits: 64
        } as const;
        await verify(query, 'https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-2.6.11.tgz');
      });
    });

    describe('rhel 7.1 ppc', function() {
      withFakeDistro('rhel71');

      it('should resolve 4.4.5 with rhel-specific url', async function() {
        const query = {
          version: '4.4.5',
          platform: 'linux',
          arch: 'ppc64',
          enterprise: true
        };

        await verify(query, 'https://downloads.mongodb.com/linux/mongodb-linux-ppc64le-enterprise-rhel71-4.4.5.tgz');
      });
    });
  });

  describe('windows', function() {
    it('should resolve 3.1.9', async function() {
      const query = {
        version: '3.1.9',
        platform: 'win32',
        bits: 64
      } as const;
      await verify(query, 'https://fastdl.mongodb.org/win32/mongodb-win32-x86_64-2008plus-ssl-3.1.9.zip');
    });
    it('should resolve 3.1.19 enterprise', async function() {
      const query = {
        version: '3.1.9',
        platform: 'win32',
        enterprise: true,
        bits: 64
      } as const;
      await verify(query, 'https://downloads.mongodb.com/win32/mongodb-win32-x86_64-enterprise-windows-64-3.1.9.zip');
    });
    it('should resolve 2.6.11', async function() {
      const query = {
        version: '2.6.11',
        platform: 'win32',
        bits: 64
      } as const;
      await verify(query, 'https://fastdl.mongodb.org/win32/mongodb-win32-x86_64-2008plus-2.6.11.zip');
    });
    it('should resolve 3.0.7 (32-bit)', async function() {
      const query = {
        version: '3.0.7',
        platform: 'win32',
        bits: 32
      } as const;
      await verify(query, 'https://fastdl.mongodb.org/win32/mongodb-win32-i386-3.0.7.zip');
    });
    it('should resolve 4.2.1 (64-bit)', async function() {
      const query = {
        version: '4.2.1',
        platform: 'win32',
        bits: 64
      } as const;
      await verify(query, 'https://fastdl.mongodb.org/win32/mongodb-win32-x86_64-2012plus-4.2.1.zip');
    });
    it('should resolve stable (64-bit)', async function() {
      const query = {
        version: 'stable',
        platform: 'win32',
        bits: 64
      } as const;
      await verify(query, kUnknownUrl);
    });
  });

  describe('osx', function() {
    it('should resolve 3.1.19 enterprise', async function() {
      const query = {
        version: '3.1.9',
        platform: 'osx',
        enterprise: true,
        bits: 64
      } as const;
      await verify(query, 'https://downloads.mongodb.com/osx/mongodb-osx-x86_64-enterprise-3.1.9.tgz');
    });

    it('should resolve 3.6.8', async function() {
      const query = {
        version: '3.6.8',
        platform: 'osx',
        bits: 64
      } as const;
      await verify(query, 'https://fastdl.mongodb.org/osx/mongodb-osx-ssl-x86_64-3.6.8.tgz');
    });

    it('should resolve 4.0.3', async function() {
      const query = {
        version: '4.0.3',
        platform: 'osx',
        bits: 64
      } as const;
      await verify(query, 'https://fastdl.mongodb.org/osx/mongodb-osx-ssl-x86_64-4.0.3.tgz');
    });

    it('should resolve 4.1.3', async function() {
      const query = {
        version: '4.1.3',
        platform: 'osx',
        bits: 64
      } as const;
      await verify(query, 'https://fastdl.mongodb.org/osx/mongodb-macos-x86_64-4.1.3.tgz');
    });

    it('should resolve 3.5.13 community', async function() {
      const query = {
        version: '3.5.13',
        platform: 'osx',
        bits: 64
      } as const;

      await verify(query, 'https://fastdl.mongodb.org/osx/mongodb-osx-ssl-x86_64-3.5.13.tgz');
    });

    it('should resolve 3.0.0 without ssl', async function() {
      const query = {
        version: '3.0.0',
        platform: 'osx',
        bits: 64
      } as const;

      await verify(query, 'https://fastdl.mongodb.org/osx/mongodb-osx-x86_64-3.0.0.tgz');
    });

    it('should resolve 2.6.0 without ssl', async function() {
      const query = {
        version: '2.6.0',
        platform: 'osx',
        bits: 64
      } as const;

      await verify(query, 'https://fastdl.mongodb.org/osx/mongodb-osx-x86_64-2.6.0.tgz');
    });

    it('should resolve 3.2.0 with ssl', async function() {
      const query = {
        version: '3.2.0',
        platform: 'osx',
        bits: 64
      } as const;

      await verify(query, 'https://fastdl.mongodb.org/osx/mongodb-osx-ssl-x86_64-3.2.0.tgz');
    });

    it('should resolve 3.6.0-rc3 with ssl', async function() {
      const query = {
        version: '3.6.0-rc3',
        platform: 'osx',
        bits: 64
      } as const;

      await verify(query, 'https://fastdl.mongodb.org/osx/mongodb-osx-ssl-x86_64-3.6.0-rc3.tgz');
    });
  });

  describe('version aliases', function() {
    it('should resolve `stable`', async function() {
      const query = {
        version: 'stable'
      };
      await verify(query, kUnknownUrl);
    });

    it('should resolve `unstable`', async function() {
      const query = {
        version: 'unstable'
      };
      await verify(query, kUnknownUrl);
    });

    it('should resolve `latest`', async function() {
      const query = {
        version: 'latest'
      };
      await verify(query, kUnknownUrl);
    });

    it('should resolve `rapid`', async function() {
      const query = {
        version: 'rapid'
      };
      await verify(query, kUnknownUrl);
    });

    it('should resolve `latest-alpha` for macos arm64', async function() {
      const query = {
        version: 'latest-alpha',
        platform: 'macos',
        enterprise: true,
        arch: 'aarch64'
      };
      await verify(query, 'https://downloads.mongodb.com/osx/mongodb-macos-arm64-enterprise-latest.tgz');
    });

    it('should resolve `latest-alpha` for macos x64', async function() {
      const query = {
        version: 'latest-alpha',
        platform: 'macos',
        enterprise: true,
        arch: 'x64'
      };
      await verify(query, 'https://downloads.mongodb.com/osx/mongodb-macos-x86_64-enterprise-latest.tgz');
    });

    it('should resolve `latest-alpha` for windows', async function() {
      const query = {
        version: 'latest-alpha',
        platform: 'windows',
        enterprise: true,
        bits: 64
      } as const;
      await verify(query, 'https://downloads.mongodb.com/windows/mongodb-windows-x86_64-enterprise-latest.zip');
    });

    it('should resolve `latest-alpha` for linux', async function() {
      const query = {
        version: 'latest-alpha',
        platform: 'linux',
        distro: 'ubuntu2004',
        enterprise: true,
        bits: 64
      } as const;
      await verify(query, 'https://downloads.mongodb.com/linux/mongodb-linux-x86_64-enterprise-ubuntu2004-latest.tgz');
    });
  });

  describe('options', function() {
    it('should handle empty options', async function() {
      await verify({}, kUnknownUrl);
    });

    it('should handle no options at all', async function() {
      await verify(undefined, kUnknownUrl);
    });

    it('should handle a version string input', async function() {
      await verify('7.0.11', kUnknownUrl);
    });

    it('should use the MONGODB_VERSION environment variable for version', async function() {
      process.env.MONGODB_VERSION = '3.0.7';
      const query = {
        platform: 'win32',
        bits: 32
      } as const;
      await verify(query, 'https://fastdl.mongodb.org/win32/mongodb-win32-i386-3.0.7.zip');
      delete process.env.MONGODB_VERSION;
    });
  });

  describe('errors', function() {
    it('fails for bad versions', async function() {
      const query = {
        version: '123.456.789'
      };
      await assert.rejects(() => verify(query, kUnknownUrl), /Could not find version matching/);
    });

    it('fails for bad download specifiers', async function() {
      const query = {
        version: '1.0.0',
        enterprise: true
      };
      await assert.rejects(() => verify(query, kUnknownUrl), /Could not find download URL for/);
    });
  });

  describe('full.json cache', function() {
    let tmpdir, cachePath;
    let server, versionListUrl, currentFakeVersion, baseOptions;

    function fakeVersion(version: string) {
      return {
        versions: [
          {
            version: version,
            production_release: true,
            downloads: [
              {
                target: 'linux_x86_64',
                edition: 'targeted',
                arch: 'x64',
                archive: {
                  url: `${versionListUrl}${version}.tgz`
                }
              }
            ]
          }
        ]
      };
    }

    beforeEach(async function() {
      currentFakeVersion = '1.2.1';
      tmpdir = path.join(__dirname, '..', 'tmp-' + Date.now());
      cachePath = path.join(tmpdir, 'mongodb-full-json-cache.gz');
      await fs.mkdir(tmpdir, { recursive: true });
      await clearCache(''); // Clear in-memory cache.
      server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(fakeVersion(currentFakeVersion)));
      }).listen(0);
      await once(server, 'listening');
      versionListUrl = `http://localhost:${server.address().port}/`;
      baseOptions = { cachePath, versionListUrl, platform: 'linux', arch: 'x64', distro: 'ubuntu2004' };
      process.umask(0o002);
    });
    afterEach(async function() {
      await fs.rmdir(tmpdir, { recursive: true });
      await clearCache(''); // Clear in-memory cache.
      server.close();
      process.umask(0o022);
    });

    it('stores a cache file with mode 0o644', async function() {
      if (process.platform === 'win32') {
        return this.skip();
      }
      await verify({ ...baseOptions }, `${versionListUrl}1.2.1.tgz`);
      assert.strictEqual((await fs.stat(cachePath)).mode & 0o777, 0o644);
    });

    it('caches in memory if possible', async function() {
      await verify({ ...baseOptions }, `${versionListUrl}1.2.1.tgz`);
      await fs.stat(cachePath);
      await fs.unlink(cachePath);
      await verify({ ...baseOptions }, `${versionListUrl}1.2.1.tgz`);
      await assert.rejects(() => fs.stat(cachePath), /ENOENT/);
    });

    it('reads from disk if in-memory cache is cleared', async function() {
      await verify({ ...baseOptions }, `${versionListUrl}1.2.1.tgz`);
      await fs.stat(cachePath);
      await clearCache('');
      await fs.writeFile(cachePath, zlib.gzipSync(JSON.stringify(fakeVersion('1.2.3'))));
      await verify({ ...baseOptions }, `${versionListUrl}1.2.3.tgz`);
    });

    it('does not write to disk if requested not to', async function() {
      await verify({ ...baseOptions, cacheTimeMs: 0 }, `${versionListUrl}1.2.1.tgz`);
      await assert.rejects(() => fs.stat(cachePath), /ENOENT/);
    });

    it('refuses to read the disk cache if permissions are insecure', async function() {
      if (process.platform === 'win32') {
        return this.skip();
      }
      await verify({ ...baseOptions }, `${versionListUrl}1.2.1.tgz`);
      await fs.stat(cachePath);
      await clearCache('');
      await fs.unlink(cachePath);
      await fs.writeFile(cachePath, zlib.gzipSync(JSON.stringify(fakeVersion('1.2.3'))), { mode: 0o666 });
      await verify({ ...baseOptions }, `${versionListUrl}1.2.1.tgz`);
    });

    it('refuses to read the disk cache if it is outdated', async function() {
      await verify({ ...baseOptions }, `${versionListUrl}1.2.1.tgz`);
      await fs.stat(cachePath);
      await clearCache('');
      const twoDaysAgo = new Date().getTime() / 1000 - 2 * 24 * 3600;
      await fs.utimes(cachePath, twoDaysAgo, twoDaysAgo);
      currentFakeVersion = '1.2.2';
      await verify({ ...baseOptions }, `${versionListUrl}1.2.2.tgz`);
    });
  });
});
