import type { ChildProcess } from 'child_process';
import { spawn } from 'child_process';
import { promises as fs, createWriteStream } from 'fs';
import {
  createLogEntryIterator,
  filterLogStreamForPort,
} from './mongologreader';
import { Readable } from 'stream';
import type { Document } from 'mongodb';
import { MongoClient } from 'mongodb';
import path from 'path';
import { once } from 'events';
import { uuid, debug, getPort } from './util';

export interface MongoServerOptions {
  binDir?: string;
  binary: string; // 'mongod', 'mongos', etc.
  tmpDir: string; // Stores e.g. database contents
  logDir?: string; // If set, pipe log file output through here.
  args?: string[]; // May or may not contain --port
  docker?: string; // Image
}

export class MongoServer {
  private buildInfo?: Document;
  private childProcess?: ChildProcess;
  private pid?: number;
  private port?: number;
  private dbPath?: string;

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
    const srv = new MongoServer();

    if (!options.docker) {
      const dbPath = path.join(options.tmpDir, `db-${uuid()}`);
      await fs.mkdir(dbPath, { recursive: true });
      srv.dbPath = dbPath;
    }

    // SERVER-78384: mongos does not understand `--port 0` ...
    const arbitraryPort = options.binary === 'mongos' ? await getPort() : 0;

    const commandline: string[] = [];
    if (options.docker) {
      commandline.push('docker', 'run', '--network=host');
      if (options.binDir) {
        commandline.push(`--volume=${options.binDir}:/runner-bin:ro`);
      }
      commandline.push(options.docker);
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
    if (!options.args?.includes('--port'))
      commandline.push('--port', String(arbitraryPort));
    if (!options.args?.includes('--dbpath') && options.binary === 'mongod')
      commandline.push('--dbpath', options.docker ? '/tmp' : srv.dbPath!);

    debug('starting server', commandline);
    const [executable, ...args] = commandline;
    const proc = spawn(executable, args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      cwd: options.tmpDir,
      detached: true,
    });
    srv.childProcess = proc;
    srv.pid = proc.pid;

    const { stdout, stderr } = proc;
    stdout.setEncoding('utf8');
    stderr.setEncoding('utf8');

    if (options.logDir) {
      const outFile = path.join(
        options.logDir,
        `${options.binary}-${String(proc.pid)}-${new Date().toISOString()}.log`
      );
      await fs.mkdir(options.logDir, { recursive: true });
      const outStream = createWriteStream(outFile);
      stdout.pipe(outStream);
      stderr.pipe(outStream);
    } else {
      stderr.on('data', (chunk) => debug('server stderr', chunk));
      stderr.resume();
      stdout.resume();
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const logEntryStream = Readable.from(createLogEntryIterator(stdout));
      logEntryStream.on('data', (entry) => {
        if (['E', 'F'].includes(entry.severity)) {
          debug('mongodb server output', entry);
        }
      });
      const { port } = await filterLogStreamForPort(logEntryStream);
      debug('server listening on port', port);
      if (port === -1) {
        // This likely means that stdout ended before we could get a path/port
        // from it, most likely because spawning itself failed.
        throw new Error('server log output did not include port or socket');
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
    if (this.childProcess) {
      debug('closing running process', this.childProcess.pid);
      if (this.childProcess.exitCode === null) {
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
    this.buildInfo = await this.withClient(
      async (client) => await client.db('admin').command({ buildInfo: 1 })
    );
    debug('got server build info', this.serverVersion, this.serverVariant);
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
      await client.close();
    }
  }
}
