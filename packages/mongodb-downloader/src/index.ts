/* eslint-disable no-console */
import fetch from 'node-fetch';
import * as tar from 'tar';
import { createHash } from 'crypto';
import { promisify } from 'util';
import { promises as fs, createWriteStream } from 'fs';
import path from 'path';
import decompress from 'decompress';
import { pipeline, Transform } from 'stream';
import getDownloadURL from 'mongodb-download-url';
import type {
  Options as DownloadOptions,
  DownloadArtifactInfo,
} from 'mongodb-download-url';
import createDebug from 'debug';
import { withLock } from './with-lock';

const debug = createDebug('mongodb-downloader');

export type { DownloadOptions };

export type DownloadResult = DownloadArtifactInfo & {
  downloadedBinDir: string;
};

export type MongoDBDownloaderOptions = {
  /** The directory to download the artifacts to. */
  directory: string;
  /** The semantic version specifier for the target version. */
  version?: string;
  /** Whether to use a lockfile for preventing concurrent downloads of the same version. */
  useLockfile: boolean;
  /** The options to pass to the download URL lookup. */
  downloadOptions?: DownloadOptions;
  /**
   * A direct URL to a MongoDB tarball to download. If set, `version` and
   * `downloadOptions` are ignored and no download URL lookup is performed.
   */
  downloadUrl?: string;
};

export class MongoDBDownloader {
  async downloadMongoDbWithVersionInfo({
    downloadOptions = {},
    version = '*',
    directory,
    useLockfile,
    downloadUrl,
  }: MongoDBDownloaderOptions): Promise<DownloadResult> {
    await fs.mkdir(directory, { recursive: true });
    const isWindows = ['win32', 'windows'].includes(
      downloadOptions.platform ?? process.platform,
    );
    const isCryptLibrary = !!downloadOptions.crypt_shared;
    let isEnterprise = downloadOptions.enterprise ?? false;
    let versionName = version;

    if (/-enterprise$/.test(version)) {
      isEnterprise = true;
      version = version.replace(/-enterprise$/, '');
      versionName = versionName.replace(/-enterprise$/, '');
    }

    if (versionName !== 'latest-alpha') {
      versionName = versionName + (isEnterprise ? '-enterprise' : '-community');
    }

    const downloadTarget = downloadUrl
      ? path.resolve(
          directory,
          `mongodb-custom-${createHash('sha256')
            .update(downloadUrl)
            .digest('hex')
            .slice(0, 16)}`,
        )
      : path.resolve(
          directory,
          `mongodb-${process.platform}-${process.env.DISTRO_ID || 'none'}-${
            process.arch
          }-${versionName}`.replace(/[^a-zA-Z0-9_-]/g, ''),
        );
    const bindir = path.resolve(
      downloadTarget,
      isCryptLibrary && !isWindows ? 'lib' : 'bin',
    );

    return (async () => {
      const artifactInfoFile = path.join(bindir, '.artifact_info');

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
      return await (useLockfile ? withLock : withoutLock)(
        downloadTarget,
        async () => {
          // Check again inside lock in case another process downloaded it
          const downloadedFile = await this.getCurrentDownloadedFile({
            bindir,
            artifactInfoFile,
          });
          if (downloadedFile) {
            debug(
              `Skipping download because ${downloadTarget} exists after waiting on lock`,
            );
            return downloadedFile;
          }

          await fs.mkdir(downloadTarget, { recursive: true });
          const artifactInfo = downloadUrl
            ? ({ url: downloadUrl } as DownloadArtifactInfo)
            : await this.lookupDownloadUrl({
                targetVersion: version,
                enterprise: isEnterprise,
                options: downloadOptions,
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
        },
      );
    })();
  }

  static HWM = 1024 * 1024;

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
      highWaterMark: MongoDBDownloader.HWM,
    } as Parameters<typeof fetch>[1]);
    if (!response.ok) {
      throw new Error(
        `Failed to download ${url}: ${response.status} ${response.statusText}`,
      );
    }
    const totalBytes = +(response.headers.get('content-length') ?? '');
    const totalMB = totalBytes ? (totalBytes / 1048576).toFixed(1) : null;
    debug(`Download started`, { url, totalMB });
    let downloadedBytes = 0;
    let lastProgressLog = Date.now();
    const progress = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        downloadedBytes += chunk.length;
        if (Date.now() - lastProgressLog >= 3000) {
          lastProgressLog = Date.now();
          const downloadedMB = (downloadedBytes / 1048576).toFixed(1);
          debug(
            `Downloading: ${downloadedMB}MB${totalMB ? ` / ${totalMB}MB` : ''}`,
          );
        }
        callback(null, chunk);
      },
    });
    if (/\.tgz$|\.tar(\.[^.]+)?$/.exec(url)) {
      // the server's tarballs can contain hard links, which the (unmaintained?)
      // `download` package is unable to handle (https://github.com/kevva/decompress/issues/93)
      await promisify(pipeline)(
        response.body,
        progress,
        tar.x({ cwd: downloadTarget, strip: isCryptLibrary ? 0 : 1 }),
      );
    } else {
      const filename = path.join(
        downloadTarget,
        path.basename(new URL(url).pathname),
      );
      await promisify(pipeline)(
        response.body,
        progress,
        createWriteStream(filename, { highWaterMark: MongoDBDownloader.HWM }),
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
        // eslint-disable-next-line no-console
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
}

/** Runs the callback without a lock, using same interface as `withLock` */
async function withoutLock<T>(
  bindir: string,
  callback: () => Promise<T>,
): Promise<T> {
  return await callback();
}

const downloader = new MongoDBDownloader();

/** Download mongod + mongos with version info and return version info and the path to a directory containing them. */
export async function downloadMongoDbWithVersionInfo(
  options: MongoDBDownloaderOptions,
): Promise<DownloadResult> {
  return await downloader.downloadMongoDbWithVersionInfo(options);
}
/** Download mongod + mongos and return the path to a directory containing them. */
export async function downloadMongoDb(
  options: MongoDBDownloaderOptions,
): Promise<string> {
  return (await downloader.downloadMongoDbWithVersionInfo(options))
    .downloadedBinDir;
}
