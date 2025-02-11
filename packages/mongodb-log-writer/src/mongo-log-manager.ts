import path from 'path';
import { ObjectId } from 'bson';
import { once } from 'events';
import { createWriteStream, promises as fs } from 'fs';
import { createGzip, constants as zlibConstants } from 'zlib';
import { Heap } from 'heap-js';
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
  /** The maximal size of log files which are kept. */
  retentionGB?: number;
  /** Prefix to use for the log files */
  prefix?: string;
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
    if (options.prefix) {
      if (!/^[a-z0-9_]+$/i.test(options.prefix)) {
        throw new Error(
          'Prefix must only contain letters, numbers, and underscores'
        );
      }
    }
    this._options = options;
  }

  private async deleteFile(path: string): Promise<void> {
    try {
      await fs.unlink(path);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err?.code !== 'ENOENT') {
        this._options.onerror(err as Error, path);
      }
    }
  }

  private get prefix() {
    return this._options.prefix ?? '';
  }

  /** Clean up log files older than `retentionDays`. */
  async cleanupOldLogFiles(maxDurationMs = 5_000, remainingRetries = 1): Promise<void> {
    const deletionStartTimestamp = Date.now();
    // Delete files older than N days
    const deletionCutoffTimestamp =
      deletionStartTimestamp - this._options.retentionDays * 86400 * 1000;

    const dir = this._options.directory;
    let dirHandle;
    try {
      dirHandle = await fs.opendir(dir);
    } catch {
      return;
    }

    // Store the known set of least recent files in a heap in order to be able to
    // delete all but the most recent N files.
    const leastRecentFileHeap = new Heap<{
      fileTimestamp: number;
      fullPath: string;
      fileSize: number | undefined;
    }>((a, b) => a.fileTimestamp - b.fileTimestamp);

    let usedStorageSize = this._options.retentionGB ? 0 : -Infinity;

    try {
      for await (const dirent of dirHandle) {
        // Cap the overall time spent inside this function. Consider situations like
        // a large number of machines using a shared network-mounted $HOME directory
        // where lots and lots of log files end up and filesystem operations happen
        // with network latency.
        if (Date.now() - deletionStartTimestamp > maxDurationMs) break;
  
        if (!dirent.isFile()) continue;
        const logRegExp = new RegExp(
          `^${this.prefix}(?<id>[a-f0-9]{24})_log(\\.gz)?$`,
          'i'
        );
        const { id } = logRegExp.exec(dirent.name)?.groups ?? {};
        if (!id) continue;
  
        const fileTimestamp = +new ObjectId(id).getTimestamp();
        const fullPath = path.join(dir, dirent.name);
  
        // If the file is older than expected, delete it. If the file is recent,
        // add it to the list of seen files, and if that list is too large, remove
        // the least recent file we've seen so far.
        if (fileTimestamp < deletionCutoffTimestamp) {
          await this.deleteFile(fullPath);
          continue;
        }
  
        let fileSize: number | undefined;
        if (this._options.retentionGB) {
          try {
            fileSize = (await fs.stat(fullPath)).size;
            usedStorageSize += fileSize;
          } catch (err) {
            this._options.onerror(err as Error, fullPath);
            continue;
          }
        }
  
        if (this._options.maxLogFileCount || this._options.retentionGB) {
          leastRecentFileHeap.push({ fullPath, fileTimestamp, fileSize });
        }
  
        if (
          this._options.maxLogFileCount &&
          leastRecentFileHeap.size() > this._options.maxLogFileCount
        ) {
          const toDelete = leastRecentFileHeap.pop();
          if (!toDelete) continue;
          await this.deleteFile(toDelete.fullPath);
          usedStorageSize -= toDelete.fileSize ?? 0;
        }
      }
    } catch (statErr: any) {
      // Multiple processes may attempt to clean up log files in parallel.
      // A situation can arise where one process tries to read a file
      // that another process has already unlinked (see MONGOSH-1914).
      // To handle such scenarios, we will catch lstat errors and retry cleaning up
      // to let different processes reach out to different log files.
      if (statErr.code === 'ENOENT' && remainingRetries > 0) {
        await this.cleanupOldLogFiles(maxDurationMs - (Date.now() - deletionStartTimestamp), remainingRetries - 1);
      }
    }

    if (this._options.retentionGB) {
      const storageSizeLimit = this._options.retentionGB * 1024 * 1024 * 1024;

      for (const file of leastRecentFileHeap) {
        if (Date.now() - deletionStartTimestamp > maxDurationMs) break;

        if (usedStorageSize <= storageSizeLimit) break;

        if (!file.fileSize) continue;

        await this.deleteFile(file.fullPath);
        usedStorageSize -= file.fileSize;
      }
    }
  }

  /** Create a MongoLogWriter stream for a new log file. */
  async createLogWriter(): Promise<MongoLogWriter> {
    const logId = new ObjectId().toString();
    const doGzip = !!this._options.gzip;
    const logFilePath = path.join(
      this._options.directory,
      `${this.prefix}${logId}_log${doGzip ? '.gz' : ''}`
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
