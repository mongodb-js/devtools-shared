import type { ChildProcess } from 'child_process';
import { spawn } from 'child_process';
import { promises as fs, createWriteStream } from 'fs';
import type { LogEntry } from './mongologreader';
import {
  createLogEntryIterator,
  filterLogStreamForBuildInfo,
  filterLogStreamForPort,
  isFailureToSetupListener,
} from './mongologreader';
import { Readable } from 'stream';
import type { Document } from 'mongodb';
import { MongoClient } from 'mongodb';
import path from 'path';
import { once } from 'events';
import { uuid, debug } from './util';

export interface MongoServerOptions {
  binDir?: string;
  binary: string; // 'mongod', 'mongos', etc.
  tmpDir: string; // Stores e.g. database contents
  logDir?: string; // If set, pipe log file output through here.
  args?: string[]; // May or may not contain --port
  docker?: string | string[]; // Image or docker options
}

export class MongoServer {
  private buildInfo?: Document;
  private childProcess?: ChildProcess;
  private pid?: number;
  private port?: number;
  private dbPath?: string;
  private closing = false;

  private constructor() {
    /* see .start() */
  }

  serialize(): unknown /* JSON-serializable */ {
    return {
      pid: this.pid,
      port: this.port,
      dbPath: this.dbPath,
    };
  }

  static async deserialize(serialized: any): Promise<MongoServer> {
    const srv = new MongoServer();
    srv.pid = serialized.pid;
    srv.port = serialized.port;
    srv.dbPath = serialized.dbPath;
    await srv._populateBuildInfo();
    return srv;
  }

  // Throws before .start() and after .close()
  get hostport(): string {
    if (this.port === undefined) {
      throw new Error('Cannot get host/port for closed server');
    }
    return `127.0.0.1:${this.port}`;
  }

  // Returns the version reported in the server log output
  get serverVersion(): string {
    if (!this.buildInfo) {
      throw new Error('Cannot get version for closed server');
    }
    return this.buildInfo.version;
  }
  get serverVariant(): 'enterprise' | 'community' {
    if (!this.buildInfo) {
      throw new Error('Cannot get version for closed server');
    }
    return this.buildInfo.modules?.includes?.('enterprise')
      ? 'enterprise'
      : 'community';
  }

  static async start({ ...options }: MongoServerOptions): Promise<MongoServer> {
    if (options.binary === 'mongos' && !options.args?.includes('--port')) {
      // SERVER-78384: mongos before 7.1.0 does not understand `--port 0` ...
      // Just pick a random port in [1024, 49152), try to listen, and continue until
      // we find a free one.
      const minPort = 1025;
      const maxPort = 49151;
      let port = Math.floor(Math.random() * (maxPort - minPort) + minPort);
      // eslint-disable-next-line no-constant-condition
      while (true) {
        try {
          debug('Trying to spawn mongos on port', port);
          return await this._start({
            ...options,
            args: [...(options.args ?? []), '--port', String(port)],
          });
        } catch (err) {
          if (
            ((err as any).errorLogEntries as LogEntry[]).some(
              isFailureToSetupListener
            )
          ) {
            if (port === maxPort) port = minPort;
            else port++;
            continue;
          }
          throw err;
        }
      }
    }
    return await this._start(options);
  }

  static async _start({
    ...options
  }: MongoServerOptions): Promise<MongoServer> {
    const srv = new MongoServer();

    if (!options.docker) {
      const dbPath = path.join(options.tmpDir, `db-${uuid()}`);
      await fs.mkdir(dbPath, { recursive: true });
      srv.dbPath = dbPath;
    }

    const commandline: string[] = [];
    if (options.docker) {
      commandline.push('docker', 'run', '--network=host');
      if (options.binDir) {
        commandline.push(`--volume=${options.binDir}:/runner-bin:ro`);
      }
      if (Array.isArray(options.docker)) commandline.push(...options.docker);
      else commandline.push(options.docker);
      if (options.binDir) {
        commandline.push(`/runner-bin/${options.binary}`);
      } else {
        commandline.push(options.binary);
      }
    } else if (options.binDir) {
      commandline.push(path.join(options.binDir, options.binary));
    } else {
      commandline.push(options.binary);
    }

    commandline.push(...(options.args ?? []));
    if (!options.args?.includes('--port')) commandline.push('--port', '0');
    if (!options.args?.includes('--dbpath') && options.binary === 'mongod')
      commandline.push('--dbpath', options.docker ? '/tmp' : srv.dbPath!);
    if (
      !options.args?.includes('--unixSocketPrefix') &&
      process.platform !== 'win32'
    )
      commandline.push('--nounixsocket');

    debug('starting server', commandline);
    const [executable, ...args] = commandline;
    const proc = spawn(executable, args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      cwd: options.tmpDir,
      detached: true,
    });
    await once(proc, 'spawn');
    srv.childProcess = proc;
    srv.pid = proc.pid;

    const { stdout, stderr } = proc;
    stdout.setEncoding('utf8');
    stderr.setEncoding('utf8');

    if (options.logDir) {
      const outFile = path.join(
        options.logDir,
        `${options.binary}-${String(proc.pid)}-${new Date()
          .toISOString()
          .replace(/[^-_a-zA-Z0-9.]/g, '')}.log`
      );
      await fs.mkdir(options.logDir, { recursive: true });
      const outStream = createWriteStream(outFile);
      await once(outStream, 'open');
      stdout.pipe(outStream, { end: false });
      stderr.pipe(outStream, { end: false });
      Promise.all([once(stdout, 'end'), once(stderr, 'end')]).then(
        () => outStream.end(),
        () => {
          /* ignore error */
        }
      );
    } else {
      stderr.on('data', (chunk) => debug('server stderr', chunk));
      stderr.resume();
      stdout.resume();
    }

    const errorLogEntries: LogEntry[] = [];
    try {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const logEntryStream = Readable.from(createLogEntryIterator(stdout));
      logEntryStream.on('data', (entry) => {
        if (!srv.closing && ['E', 'F'].includes(entry.severity)) {
          errorLogEntries.push(entry);
          debug('mongodb server output', entry);
        }
      });
      filterLogStreamForBuildInfo(logEntryStream).then(
        (buildInfo) => {
          (srv.buildInfo = buildInfo),
            debug(
              'got server build info from log',
              srv.serverVersion,
              srv.serverVariant
            );
        },
        () => {
          /* ignore error */
        }
      );
      const { port } = await filterLogStreamForPort(logEntryStream);
      debug('server listening on port', port);
      if (port === -1) {
        // This likely means that stdout ended before we could get a path/port
        // from it, most likely because spawning itself failed.
        let message = 'Server log output did not include port or socket';
        if (errorLogEntries.length > 0) {
          const format = (entry: LogEntry) =>
            `${entry.message} ${JSON.stringify(entry.attr)}`;
          message = `Server failed to start: ${errorLogEntries
            .map(format)
            .join(', ')} from ${commandline.join(' ')})`;
        }
        const err: Error & { errorLogEntries?: LogEntry[] } = new Error(
          message
        );
        err.errorLogEntries = errorLogEntries;
        throw err;
      }
      logEntryStream.resume();

      srv.port = port;
      await srv._populateBuildInfo();
    } catch (err) {
      await srv.close();
      throw err;
    }

    return srv;
  }

  async close(): Promise<void> {
    this.closing = true;
    if (this.childProcess) {
      debug('closing running process', this.childProcess.pid);
      if (
        this.childProcess.exitCode === null &&
        this.childProcess.signalCode === null
      ) {
        this.childProcess.kill('SIGKILL');
        await once(this.childProcess, 'exit');
      }
      debug('stopped running process');
      this.childProcess = undefined;
    } else if (this.pid !== undefined) {
      debug('closing externally started process', this.pid);
      process.kill(this.pid, 'SIGKILL');
    }
    try {
      if (this.dbPath) await fs.rm(this.dbPath, { recursive: true });
    } catch (err) {
      debug('failed to remove dbPath', err);
    }
    this.buildInfo = undefined;
    this.port = undefined;
    this.dbPath = undefined;
  }

  private async _populateBuildInfo(): Promise<void> {
    if (this.buildInfo?.version) return;
    this.buildInfo = await this.withClient(
      async (client) => await client.db('admin').command({ buildInfo: 1 })
    );
    debug(
      'got server build info through client',
      this.serverVersion,
      this.serverVariant
    );
  }

  async withClient<Fn extends (client: MongoClient) => any>(
    fn: Fn
  ): Promise<ReturnType<Fn>> {
    const client = await MongoClient.connect(
      `mongodb://${this.hostport}/?directConnection=true`
    );
    try {
      return await fn(client);
    } finally {
      await client.close(true);
    }
  }

  ref(): void {
    this.childProcess?.ref();
    (this.childProcess?.stdout as any)?.ref();
    (this.childProcess?.stderr as any)?.ref();
  }

  unref(): void {
    this.childProcess?.unref();
    (this.childProcess?.stdout as any)?.unref();
    (this.childProcess?.stderr as any)?.unref();
  }
}
