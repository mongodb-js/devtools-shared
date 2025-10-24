import lockfile from 'proper-lockfile';
import fs from 'fs/promises';

/**
 * Acquire an advisory lock for the given path and hold it for the duration of the callback.
 *
 * The lock will be released automatically when the callback resolves or rejects.
 * Concurrent calls to withLock() for the same path will wait until the lock is released.
 */
export async function withLock<T>(
  originalFilePath: string,
  cb: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  let release: (() => Promise<void>) | undefined;

  const lockFile = `${originalFilePath}/.mongodb-downloader-lock`;

  // Create the directory if it doesn't exist
  await fs.mkdir(originalFilePath, { recursive: true });

  // Create a dummy lock file to prevent concurrent downloads of the same version
  await fs.writeFile(lockFile, '');

  try {
    release = await lockfile.lock(lockFile, {
      retries: {
        retries: 100,
        minTimeout: 100,
        maxTimeout: 5000,
        factor: 2,
      },
      stale: 100_000,
      onCompromised: () => {
        controller.abort();
      },
    });

    return await new Promise((resolve, reject) => {
      controller.signal.addEventListener('abort', () => {
        reject(new Error('Aborted by abort signal'));
      });

      void (async () => {
        try {
          resolve(await cb(controller.signal));
        } catch (err) {
          reject(err);
        }
      })();
    });
  } finally {
    if (release) {
      try {
        await release();
      } catch (err) {
        // Ignore errors during release
      }
    }
  }
}
