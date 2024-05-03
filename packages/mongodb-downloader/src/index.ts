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
const debug = createDebug('mongodb-downloader');

export type { DownloadOptions };

export type DownloadResult = DownloadArtifactInfo & {
  downloadedBinDir: string;
};

// Download mongod + mongos and return the path to a directory containing them.
export async function downloadMongoDbWithVersionInfo(
  tmpdir: string,
  targetVersionSemverSpecifier = '*',
  options: DownloadOptions = {}
): Promise<DownloadResult> {
  let wantsEnterprise = options.enterprise ?? false;
  const isWindows = ['win32', 'windows'].includes(
    options.platform ?? process.platform
  );
  async function lookupDownloadUrl(): Promise<DownloadArtifactInfo> {
    return await getDownloadURL({
      version: targetVersionSemverSpecifier,
      enterprise: wantsEnterprise,
      ...options,
    });
  }

  await fs.mkdir(tmpdir, { recursive: true });
  if (targetVersionSemverSpecifier === 'latest-alpha') {
    return await doDownload(
      tmpdir,
      !!options.crypt_shared,
      'latest-alpha',
      isWindows,
      lookupDownloadUrl
    );
  }

  if (/-enterprise$/.test(targetVersionSemverSpecifier)) {
    wantsEnterprise = true;
    targetVersionSemverSpecifier = targetVersionSemverSpecifier.replace(
      /-enterprise$/,
      ''
    );
  }

  return await doDownload(
    tmpdir,
    !!options.crypt_shared,
    targetVersionSemverSpecifier +
      (wantsEnterprise ? '-enterprise' : '-community'),
    isWindows,
    () => lookupDownloadUrl()
  );
}

const downloadPromises: Record<string, Promise<DownloadResult>> = Object.create(
  null
);
async function doDownload(
  tmpdir: string,
  isCryptLibrary: boolean,
  version: string,
  isWindows: boolean,
  lookupDownloadUrl: () => Promise<DownloadArtifactInfo>
): Promise<DownloadResult> {
  const downloadTarget = path.resolve(
    tmpdir,
    `mongodb-${process.platform}-${process.env.DISTRO_ID || 'none'}-${
      process.arch
    }-${version}`.replace(/[^a-zA-Z0-9_-]/g, '')
  );
  return (downloadPromises[downloadTarget] ??= (async () => {
    const bindir = path.resolve(
      downloadTarget,
      isCryptLibrary && !isWindows ? 'lib' : 'bin'
    );
    const artifactInfoFile = path.join(bindir, '.artifact_info');
    try {
      await fs.stat(artifactInfoFile);
      debug(`Skipping download because ${downloadTarget} exists`);
      return {
        ...JSON.parse(await fs.readFile(artifactInfoFile, 'utf8')),
        downloadedBinDir: bindir,
      };
    } catch {
      /* ignore */
    }

    await fs.mkdir(downloadTarget, { recursive: true });
    const artifactInfo = await lookupDownloadUrl();
    const { url } = artifactInfo;
    debug(`Downloading ${url} into ${downloadTarget}...`);

    // Using a large highWaterMark setting noticeably speeds up Windows downloads
    const HWM = 1024 * 1024;
    async function downloadAndExtract(withExtraStripDepth = 0): Promise<void> {
      const response = await fetch(url, {
        highWaterMark: HWM,
      } as any);
      if (/\.tgz$|\.tar(\.[^.]+)?$/.exec(url)) {
        // the server's tarballs can contain hard links, which the (unmaintained?)
        // `download` package is unable to handle (https://github.com/kevva/decompress/issues/93)
        await promisify(pipeline)(
          response.body,
          tar.x({ cwd: downloadTarget, strip: isCryptLibrary ? 0 : 1 })
        );
      } else {
        const filename = path.join(
          downloadTarget,
          path.basename(new URL(url).pathname)
        );
        await promisify(pipeline)(
          response.body,
          createWriteStream(filename, { highWaterMark: HWM })
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
          return await downloadAndExtract(1);
        }
        throw err;
      }
    }

    await downloadAndExtract();
    await fs.writeFile(artifactInfoFile, JSON.stringify(artifactInfo));
    debug(`Download complete`, bindir);
    return { ...artifactInfo, downloadedBinDir: bindir };
  })());
}

export async function downloadMongoDb(
  ...args: Parameters<typeof downloadMongoDbWithVersionInfo>
): Promise<string> {
  return (await downloadMongoDbWithVersionInfo(...args)).downloadedBinDir;
}
