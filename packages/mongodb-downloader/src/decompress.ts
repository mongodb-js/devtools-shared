import { promises as fs, createWriteStream } from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import * as yauzl from 'yauzl';

export type ExtractZipOptions = {
  /** Number of leading path components to remove from each entry. */
  strip?: number;
  /** Entries for which this returns `false` are not written. Receives the stripped path. */
  filter?: (entryPath: string) => boolean;
  /** Write stream high water mark. */
  highWaterMark?: number;
};

/**
 * Extracts a zip archive into `destination`, streaming each entry to disk.
 *
 * This only handles files and directories, which is all the MongoDB Windows
 * artifacts (the only zips we download) contain. Entry names are validated by
 * yauzl, so entries cannot escape `destination`.
 */
export async function extractZip(
  archivePath: string,
  destination: string,
  { strip = 0, filter, highWaterMark }: ExtractZipOptions = {},
): Promise<void> {
  const zipFile = await yauzl.openPromise(archivePath, { lazyEntries: true });

  try {
    for await (const entry of zipFile.eachEntry()) {
      const entryPath = entry.fileName.split('/').slice(strip).join('/');
      if (!entryPath || (filter && !filter(entryPath))) {
        continue;
      }

      const target = path.join(destination, entryPath);
      // Directory entries are required to end in a slash.
      if (entry.fileName.endsWith('/')) {
        await fs.mkdir(target, { recursive: true });
        continue;
      }

      await fs.mkdir(path.dirname(target), { recursive: true });
      await pipeline(
        await zipFile.openReadStreamPromise(entry),
        createWriteStream(target, { highWaterMark }),
      );
    }
  } finally {
    zipFile.close();
  }
}
