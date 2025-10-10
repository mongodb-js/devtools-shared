/* eslint-disable no-console */
import fetch from 'node-fetch';
import tar from 'tar';
import { promisify } from 'util';
import { promises as fs, createWriteStream } from 'fs';
import path from 'path';
import decompress from 'decompress';
import { pipeline } from 'stream';
import getDownloadURL from 'mongodb-download-url';
import type {
  Options as DownloadOptions,
  DownloadArtifactInfo,
} from 'mongodb-download-url';
import createDebug from 'debug';
import { withLock } from './npm-with-lock';
export const debug = createDebug('mongodb-downloader');

export type { DownloadOptions };

export type DownloadResult = DownloadArtifactInfo & {
  downloadedBinDir: string;
};

export class MongoDbDownloader {
  private tmpdir: string;

  constructor({ tmpdir }: { tmpdir: string }) {
    this.tmpdir = tmpdir;
  }

  private downloadPromises: Record<string, Promise<DownloadResult>> =
    Object.create(null);

  // Download mongod + mongos and return the path to a directory containing them.
  async downloadMongoDbWithVersionInfo(
    targetVersion = '*',
    options: DownloadOptions = {},
  ): Promise<DownloadResult> {
    await fs.mkdir(this.tmpdir, { recursive: true });
    if (targetVersion === 'latest-alpha') {
      return await this.doDownload('latest-alpha', options);
    }

    return await this.doDownload(targetVersion, options);
  }

  private async lookupDownloadUrl({
    targetVersion,
    enterprise,
    options,
  }: {
    targetVersion: string;
    enterprise: boolean;
    options: DownloadOptions;
  }): Promise<DownloadArtifactInfo> {
    return await getDownloadURL({
      version: targetVersion,
      enterprise,
      ...options,
    });
  }

  private async doDownload(
    version: string,
    options: DownloadOptions,
  ): Promise<DownloadResult> {
    const isWindows = ['win32', 'windows'].includes(
      options.platform ?? process.platform,
    );
    const isCryptLibrary = !!options.crypt_shared;
    const isEnterprise = options.enterprise ?? false;

    const downloadTarget = path.resolve(
      this.tmpdir,
      `mongodb-${process.platform}-${process.env.DISTRO_ID || 'none'}-${
        process.arch
      }-${version}`.replace(/[^a-zA-Z0-9_-]/g, ''),
    );
    return (this.downloadPromises[downloadTarget] ??= (async () => {
      const bindir = path.resolve(
        downloadTarget,
        isCryptLibrary && !isWindows ? 'lib' : 'bin',
      );

      const artifactInfoFile = path.join(bindir, '.artifact_info');
      const lockPath = `${downloadTarget}.lock`;

      // Check if already downloaded before acquiring lock
      const currentDownloadedFile = await this.getCurrentDownloadedFile({
        bindir,
        artifactInfoFile,
      });
      if (currentDownloadedFile) {
        debug(`Skipping download because ${downloadTarget} exists`);
        return currentDownloadedFile;
      }

      // Acquire the lock and perform download
      return await withLock(lockPath, async (signal) => {
        // Check again inside lock in case another process downloaded it
        const downloadedFile = await this.getCurrentDownloadedFile({
          bindir,
          artifactInfoFile,
        });
        if (downloadedFile) {
          debug(
            `Skipping download because ${downloadTarget} exists (checked inside lock)`,
          );
          return downloadedFile;
        }

        await fs.mkdir(downloadTarget, { recursive: true });
        const artifactInfo = await this.lookupDownloadUrl({
          targetVersion: version,
          enterprise: isEnterprise,
          options,
        });
        const { url } = artifactInfo;
        debug(`Downloading ${url} into ${downloadTarget}...`);

        await this.downloadAndExtract({
          url,
          downloadTarget,
          isCryptLibrary,
          bindir,
        });
        await fs.writeFile(artifactInfoFile, JSON.stringify(artifactInfo));
        debug(`Download complete`, bindir);
        return { ...artifactInfo, downloadedBinDir: bindir };
      });
    })());
  }

  private async getCurrentDownloadedFile({
    bindir,
    artifactInfoFile,
  }: {
    bindir: string;
    artifactInfoFile: string;
  }): Promise<DownloadResult | undefined> {
    try {
      await fs.stat(artifactInfoFile);
      return {
        ...JSON.parse(await fs.readFile(artifactInfoFile, 'utf8')),
        downloadedBinDir: bindir,
      };
    } catch {
      /* ignore - file doesn't exist, proceed with download */
    }
  }

  // Using a large highWaterMark setting noticeably speeds up Windows downloads
  private static HWM = 1024 * 1024;

  // eslint-disable-next-line no-inner-declarations
  private async downloadAndExtract({
    withExtraStripDepth = 0,
    downloadTarget,
    isCryptLibrary,
    bindir,
    url,
  }: {
    withExtraStripDepth?: number;
    downloadTarget: string;
    isCryptLibrary: boolean;
    bindir: string;
    url: string;
  }): Promise<void> {
    const response = await fetch(url, {
      highWaterMark: MongoDbDownloader.HWM,
    } as Parameters<typeof fetch>[1]);
    if (/\.tgz$|\.tar(\.[^.]+)?$/.exec(url)) {
      // the server's tarballs can contain hard links, which the (unmaintained?)
      // `download` package is unable to handle (https://github.com/kevva/decompress/issues/93)
      await promisify(pipeline)(
        response.body,
        tar.x({ cwd: downloadTarget, strip: isCryptLibrary ? 0 : 1 }),
      );
    } else {
      const filename = path.join(
        downloadTarget,
        path.basename(new URL(url).pathname),
      );
      await promisify(pipeline)(
        response.body,
        createWriteStream(filename, { highWaterMark: MongoDbDownloader.HWM }),
      );
      debug(`Written file ${url} to ${filename}, extracting...`);
      await decompress(filename, downloadTarget, {
        strip: isCryptLibrary ? 0 : 1,
        filter: (file) => path.extname(file.path) !== '.pdb', // Windows .pdb files are huge and useless
      });
    }

    try {
      await fs.stat(bindir); // Make sure it exists.
    } catch (err) {
      if (withExtraStripDepth === 0 && url.includes('macos')) {
        // The server team changed how macos release artifacts are packed
        // and added a `./` prefix to paths in the tarball,
        // which seems like it shouldn't change anything but does
        // in fact require an increased path strip depth.
        console.info('Retry due to miscalculated --strip-components depth');
        return await this.downloadAndExtract({
          withExtraStripDepth: 1,
          url,
          downloadTarget,
          isCryptLibrary,
          bindir,
        });
      }
      throw err;
    }
  }
}
