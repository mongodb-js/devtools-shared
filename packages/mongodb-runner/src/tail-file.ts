import type { ChildProcess } from 'child_process';
import fs from 'fs';
import { Readable } from 'stream';

const POLL_INTERVAL_MS = 25;
const READ_SIZE = 64 * 1024;

/**
 * A readable stream of the (utf8) contents of a file that another process is
 * appending to. It ends once `isDone()` returns true and the file has been
 * read to its end.
 *
 * Like a child process's stdio pipes, the stream keeps the event loop alive
 * until `unref()` is called. That is needed while waiting for a server to
 * start: if the server exits, nothing else would keep us around to notice.
 */
export class FileTailStream extends Readable {
  private fd?: number;
  private timer?: NodeJS.Timeout;
  private polling = false;
  private refed = true;

  constructor(
    private readonly filePath: string,
    private readonly isDone: () => boolean,
  ) {
    super({ encoding: 'utf8' });
  }

  override _construct(callback: (err?: Error | null) => void): void {
    fs.open(this.filePath, 'r', (err, fd) => {
      this.fd = fd;
      callback(err);
    });
  }

  override _read(): void {
    if (this.polling) return;
    this.polling = true;
    this.poll();
  }

  ref(): void {
    this.refed = true;
    this.timer?.ref();
  }

  unref(): void {
    this.refed = false;
    this.timer?.unref();
  }

  override _destroy(
    err: Error | null,
    callback: (err?: Error | null) => void,
  ): void {
    clearTimeout(this.timer);
    if (this.fd === undefined) return callback(err);
    fs.close(this.fd, () => callback(err));
  }

  private poll(): void {
    // Sample this before reading: anything written before the process exited
    // is then guaranteed to be visible to the read below.
    const done = this.isDone();
    fs.read(
      this.fd as number,
      Buffer.allocUnsafe(READ_SIZE),
      0,
      READ_SIZE,
      null,
      (err, bytesRead, buf) => {
        if (this.destroyed) return;
        if (err) return void this.destroy(err);
        if (bytesRead > 0) {
          if (this.push(buf.subarray(0, bytesRead))) return this.poll();
          this.polling = false;
        } else if (done) {
          this.push(null);
        } else {
          this.timer = setTimeout(() => this.poll(), POLL_INTERVAL_MS);
          if (!this.refed) this.timer.unref();
        }
      },
    );
  }
}

/**
 * Follow `filePath` until `proc` has exited and all of its output has been read.
 *
 * This lets the process write straight to a file (so it keeps logging after the
 * current process is gone) while we still observe its output while we are alive.
 */
export function tailFileUntilExit(
  filePath: string,
  proc: ChildProcess,
): FileTailStream {
  let exited = proc.exitCode !== null || proc.signalCode !== null;
  proc.once('exit', () => {
    exited = true;
  });
  return new FileTailStream(filePath, () => exited);
}
