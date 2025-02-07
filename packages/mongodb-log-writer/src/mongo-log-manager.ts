import path from 'path';
import { ObjectId } from 'bson';
import { once } from 'events';
import { createWriteStream, promises as fs } from 'fs';
import { createGzip, constants as zlibConstants } from 'zlib';
import { MongoLogWriter } from './mongo-log-writer';
import { Writable } from 'stream';

/** Options used by MongoLogManager instances. */
interface MongoLogOptions {
  /** A base directory in which log files are stored. */
  directory: string;
  /** Whether to write files as .gz files or not. */
  gzip?: boolean;
  /** The number of calendar days after which old log files are deleted. */
  retentionDays: number;
  /** The maximal number of log files which are kept. */
  maxLogFileCount?: number;
  /** The maximal GB of log files which are kept. */
  retentionGB?: number;
  /** A handler for errors related to a specific filesystem path. */
  onerror: (err: Error, path: string) => unknown | Promise<void>;
  /** A handler for warnings related to a specific filesystem path. */
  onwarn: (err: Error, path: string) => unknown | Promise<void>;
}

/**
 * A manger for the log files of an application.
 * Log files will be stored in a single directory, following the
 * naming convention `${logId}_log`.
 */
export class MongoLogManager {
  _options: MongoLogOptions;

  constructor(options: MongoLogOptions) {
    this._options = options;
  }

  /** Clean up log files older than `retentionDays`. */
  async cleanupOldLogFiles(maxDurationMs = 5_000): Promise<void> {
    const dir = this._options.directory;
    const sortedLogFiles: {
      fullPath: string;
      id: string;
      size?: number;
    }[] = [];
    let usedStorageSize = this._options.retentionGB ? 0 : -Infinity;

    try {
      const files = await fs.readdir(dir, { withFileTypes: true });
      for (const file of files) {
        const { id } =
          /^(?<id>[a-f0-9]{24})_log(\.gz)?$/i.exec(file.name)?.groups ?? {};

        if (!file.isFile() || !id) {
          continue;
        }

        const fullPath = path.join(dir, file.name);
        let size: number | undefined;
        if (this._options.retentionGB) {
          try {
            size = (await fs.stat(fullPath)).size;
            usedStorageSize += size;
          } catch (err) {
            this._options.onerror(err as Error, fullPath);
            continue;
          }
        }

        sortedLogFiles.push({ fullPath, id, size });
      }
    } catch {
      return;
    }

    const deletionStartTimestamp = Date.now();
    // Delete files older than N days
    const deletionCutoffTimestamp =
      deletionStartTimestamp - this._options.retentionDays * 86400 * 1000;

    const storageSizeLimit = this._options.retentionGB
      ? this._options.retentionGB * 1024 * 1024 * 1024
      : Infinity;

    for await (const { id, fullPath } of [...sortedLogFiles]) {
      // Cap the overall time spent inside this function. Consider situations like
      // a large number of machines using a shared network-mounted $HOME directory
      // where lots and lots of log files end up and filesystem operations happen
      // with network latency.
      if (Date.now() - deletionStartTimestamp > maxDurationMs) break;

      const fileTimestamp = +new ObjectId(id).getTimestamp();
      let toDelete:
        | {
            fullPath: string;
            /** If the file wasn't deleted right away and there is a
             *  retention size limit, its size should be accounted */
            fileSize?: number;
          }
        | undefined;

      // If the file is older than expected, delete it. If the file is recent,
      // add it to the list of seen files, and if that list is too large, remove
      // the least recent file we've seen so far.
      if (fileTimestamp < deletionCutoffTimestamp) {
        toDelete = {
          fullPath,
        };
      } else if (this._options.retentionGB || this._options.maxLogFileCount) {
        const reachedMaxStorageSize = usedStorageSize > storageSizeLimit;
        const reachedMaxFileCount =
          this._options.maxLogFileCount &&
          sortedLogFiles.length > this._options.maxLogFileCount;

        if (reachedMaxStorageSize || reachedMaxFileCount) {
          toDelete = sortedLogFiles.shift();
        }
      }

      if (!toDelete) continue;
      try {
        await fs.unlink(toDelete.fullPath);
        if (toDelete.fileSize) {
          usedStorageSize -= toDelete.fileSize;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        if (err?.code !== 'ENOENT') {
          this._options.onerror(err as Error, fullPath);
        }
      }
    }
  }

  /** Create a MongoLogWriter stream for a new log file. */
  async createLogWriter(): Promise<MongoLogWriter> {
    const logId = new ObjectId().toString();
    const doGzip = !!this._options.gzip;
    const logFilePath = path.join(
      this._options.directory,
      `${logId}_log${doGzip ? '.gz' : ''}`
    );

    let originalTarget: Writable;
    let stream: Writable;
    let logWriter: MongoLogWriter | undefined;
    try {
      stream = createWriteStream(logFilePath, { mode: 0o600 });
      originalTarget = stream;
      await once(stream, 'ready');
      if (doGzip) {
        stream = createGzip({
          flush: zlibConstants.Z_SYNC_FLUSH,
          level: zlibConstants.Z_MAX_LEVEL,
        });
        stream.pipe(originalTarget);
      } else {
        stream.on('finish', () => stream.emit('log-finish'));
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      this._options.onwarn(err, logFilePath);
      stream = new Writable({
        write(chunk, enc, cb) {
          // Just ignore log data if there was an error.
          cb();
        },
      });
      originalTarget = stream;
      logWriter = new MongoLogWriter(logId, null, stream);
    }
    if (!logWriter) {
      logWriter = new MongoLogWriter(logId, logFilePath, stream);
    }

    // We use 'log-finish' to give consumers an event that they can
    // listen on which is always only emitted once data has actually
    // been written to disk.
    originalTarget.on('finish', () => logWriter?.emit('log-finish'));
    return logWriter;
  }
}
