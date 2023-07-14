/* eslint-disable no-console */
import fetch from 'node-fetch';
import tar from 'tar';
import { promisify } from 'util';
import { promises as fs, createWriteStream } from 'fs';
import path from 'path';
import decompress from 'decompress';
import { pipeline } from 'stream';
import getDownloadURL from 'mongodb-download-url';
import type { Options as DownloadOptions } from 'mongodb-download-url';
import createDebug from 'debug';
const debug = createDebug('mongodb-downloader');

export type { DownloadOptions };

// Download mongod + mongos and return the path to a directory containing them.
export async function downloadMongoDb(
  tmpdir: string,
  targetVersionSemverSpecifier = '*',
  options: DownloadOptions = {}
): Promise<string> {
  let wantsEnterprise = options.enterprise ?? false;
  async function lookupDownloadUrl(): Promise<string> {
    return (
      await getDownloadURL({
        version: targetVersionSemverSpecifier,
        enterprise: wantsEnterprise,
        ...options,
      })
    ).url;
  }

  await fs.mkdir(tmpdir, { recursive: true });
  if (targetVersionSemverSpecifier === 'latest-alpha') {
    return await doDownload(
      tmpdir,
      !!options.crypt_shared,
      'latest-alpha',
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
    () => lookupDownloadUrl()
  );
}

const downloadPromises: Record<string, Promise<string>> = {};
async function doDownload(
  tmpdir: string,
  isCryptLibrary: boolean,
  version: string,
  lookupDownloadUrl: () => Promise<string>
) {
  const downloadTarget = path.resolve(
    tmpdir,
    `mongodb-${process.platform}-${process.env.DISTRO_ID || 'none'}-${
      process.arch
    }-${version}`.replace(/[^a-zA-Z0-9_-]/g, '')
  );
  return (downloadPromises[downloadTarget] ??= (async () => {
    const bindir = path.resolve(
      downloadTarget,
      isCryptLibrary && process.platform !== 'win32' ? 'lib' : 'bin'
    );
    try {
      await fs.stat(bindir);
      debug(`Skipping download because ${downloadTarget} exists`);
      return bindir;
    } catch {
      /* ignore */
    }

    await fs.mkdir(downloadTarget, { recursive: true });
    const url = await lookupDownloadUrl();
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
    debug(`Download complete`, bindir);
    return bindir;
  })());
}
