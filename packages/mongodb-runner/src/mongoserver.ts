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
import type { Document, MongoClientOptions } from 'mongodb';
import { MongoClient } from 'mongodb';
import path from 'path';
import { EventEmitter, once } from 'events';
import {
  uuid,
  debug,
  pick,
  debugVerbose,
  jsonClone,
  makeConnectionString,
  sleep,
} from './util';

/**
 * Options for starting a MongoDB server process.
 */
export interface MongoServerOptions {
  /** Directory where server binaries are located. */
  binDir?: string;
  /** The MongoDB binary to run, e.g., 'mongod', 'mongos', etc. */
  binary: string;
  /** Directory for temporary files, e.g., database contents */
  tmpDir: string;
  /** If set, log file output will be piped through here. */
  logDir?: string;
  /** Arguments to pass to the MongoDB binary. May or may not contain --port */
  args?: string[];
  /** Docker image or options to run the MongoDB binary in a container. */
  docker?: string | string[];
  /** Internal options for the MongoDB client used by this server instance. */
  internalClientOptions?: Partial<MongoClientOptions>;
  /** Internal option -- if this is an arbiter, it does not understand user auth */
  isArbiter?: boolean;
  /** Internal option -- if this is a mongos instance */
  isMongos?: boolean;
  /** Internal option -- if this is a configsvr instance */
  isConfigSvr?: boolean;
  /** Internal option -- if keyfile auth is used, this will be its contents */
  keyFileContents?: string;
}

interface SerializedServerProperties {
  _id: string;
  pid?: number;
  port?: number;
  dbPath?: string;
  defaultConnectionOptions?: Partial<MongoClientOptions>;
  startTime: string;
  hasInsertedMetadataCollEntry: boolean;
  isArbiter?: boolean;
  isMongos?: boolean;
  isConfigSvr?: boolean;
  keyFileContents?: string;
}

export interface MongoServerEvents {
  mongoLog: [LogEntry];
}

function getKeyFileOption(args?: string[] | undefined): string | undefined {
  if (!args) return undefined;
  const splitArgIndex = args.indexOf('--keyFile');
  if (splitArgIndex !== -1) {
    return args[splitArgIndex + 1];
  }
  const arg = args.find((a) => a.startsWith('--keyFile='));
  return arg?.split('=')[1];
}

export class MongoServer extends EventEmitter<MongoServerEvents> {
  public uuid: string = uuid();
  private buildInfo?: Document;
  private childProcess?: ChildProcess;
  private pid?: number;
  private port?: number;
  private dbPath?: string;
  private closing = false;
  private startTime = new Date().toISOString();
  private hasInsertedMetadataCollEntry = false;
  public isArbiter = false;
  public isMongos = false;
  private isConfigSvr = false;
  private keyFileContents?: string;
  private defaultConnectionOptions?: Partial<MongoClientOptions>;

  get id(): string {
    return this.uuid;
  }

  private constructor() {
    super();
    /* see .start() */
  }

  serialize(): SerializedServerProperties {
    return {
      _id: this.uuid,
      pid: this.pid,
      port: this.port,
      dbPath: this.dbPath,
      startTime: this.startTime,
      hasInsertedMetadataCollEntry: this.hasInsertedMetadataCollEntry,
      defaultConnectionOptions: jsonClone(this.defaultConnectionOptions ?? {}),
      isArbiter: this.isArbiter,
      isMongos: this.isMongos,
      isConfigSvr: this.isConfigSvr,
      keyFileContents: this.keyFileContents,
    };
  }

  static async deserialize(
    serialized: SerializedServerProperties,
  ): Promise<MongoServer> {
    const srv = new MongoServer();
    srv.uuid = serialized._id;
    srv.port = serialized.port;
    srv.defaultConnectionOptions = serialized.defaultConnectionOptions;
    srv.closing = !!(await srv._populateBuildInfo('restore-check'));
    srv.isArbiter = !!serialized.isArbiter;
    srv.isMongos = !!serialized.isMongos;
    srv.isConfigSvr = !!serialized.isConfigSvr;
    srv.keyFileContents = serialized.keyFileContents;
    if (!srv.closing) {
      srv.pid = serialized.pid;
      srv.dbPath = serialized.dbPath;
    }
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
              isFailureToSetupListener,
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
    srv.defaultConnectionOptions = { ...options.internalClientOptions };
    srv.isArbiter = !!options.isArbiter;
    srv.isMongos = options.binary === 'mongos';
    srv.isConfigSvr = !!options.args?.includes('--configsvr');
    const keyFilePath = getKeyFileOption(options.args);
    if (keyFilePath) {
      srv.keyFileContents = await fs.readFile(keyFilePath, 'utf8');
      debug('read keyFile contents for server', {
        keyFilePath,
        uuid: srv.uuid,
      });
    }

    if (!options.docker) {
      const dbPath = path.join(options.tmpDir, `db-${srv.uuid}`);
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
          .replace(/[^-_a-zA-Z0-9.]/g, '')}.log`,
      );
      await fs.mkdir(options.logDir, { recursive: true });
      const outStream = createWriteStream(outFile);
      await once(outStream, 'open');
      stdout.pipe(outStream, { end: false });
      stderr.pipe(outStream, { end: false });
      Promise.allSettled([once(stdout, 'end'), once(stderr, 'end')]).then(
        () => outStream.end(),
        () => {
          /* cannot throw */
        },
      );
    } else {
      stderr.on('data', (chunk) => debug('server stderr', chunk));
      stderr.resume();
      stdout.resume();
    }

    const errorLogEntries: LogEntry[] = [];
    try {
      const logEntryStream = Readable.from(createLogEntryIterator(stdout));
      logEntryStream.on('data', (entry: LogEntry) => {
        srv.emit('mongoLog', entry);
        if (!srv.closing && ['E', 'F'].includes(entry.severity)) {
          errorLogEntries.push(entry);
          debug('mongodb server output', entry);
        }
        debugVerbose('mongodb server log entry', entry);
      });
      filterLogStreamForBuildInfo(logEntryStream).then(
        (buildInfo) => {
          (srv.buildInfo = buildInfo),
            debug(
              'got server build info from log',
              srv.serverVersion,
              srv.serverVariant,
            );
        },
        () => {
          /* ignore error */
        },
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
          message,
        );
        err.errorLogEntries = errorLogEntries;
        throw err;
      }
      logEntryStream.resume();

      srv.port = port;
      // If a keyFile is present, we cannot read or write on the server until
      // a user is added to the primary. This information will be populated
      // as part of the cluster's startup process when authenticating,
      // enforced by its `assertAllServersHaveInsertedLocalMetadata()` check.
      if (!keyFilePath) {
        const buildInfoError = await srv._populateBuildInfo('insert-new');
        if (buildInfoError) {
          debug('failed to get buildInfo', buildInfoError);
        }
      }
    } catch (err) {
      await srv.close();
      throw err;
    }

    return srv;
  }

  async updateDefaultConnectionOptions(
    options: Partial<MongoClientOptions>,
  ): Promise<void> {
    const start = Date.now();
    let error: unknown;
    for (let attempts = 0; attempts < 20; attempts++) {
      try {
        this.buildInfo = await this.withClient(async (client) => {
          return await client.db('admin').command({ buildInfo: 1 });
        }, options);
        error = undefined;
        break;
      } catch (err) {
        error = err;
      }
      await sleep(Math.min(1000, 2 ** attempts * 10));
    }
    debug('updated default connection options', {
      error,
      Δt: Date.now() - start,
    });
    if (error) throw error;
    this.defaultConnectionOptions = {
      ...this.defaultConnectionOptions,
      ...options,
    };
  }

  async close(): Promise<void> {
    this.closing = true;
    debug('in close', 'pid', this.pid);
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

  private async _ensureMatchingMetadataColl(
    client: MongoClient,
    mode: 'insert-new' | 'restore-check',
  ): Promise<void> {
    const hello = await client.db('admin').command({ hello: 1 });
    const { arbiterOnly } = hello;
    if (arbiterOnly === this.isArbiter) {
      debug('skipping metadata check for arbiter');
      return;
    }
    if (this.isArbiter) {
      throw new Error(
        'Arbiter flag mismatch -- server should be arbiter but hello indicates it is not',
      );
    }

    const isMongoS = hello.msg === 'isdbgrid';
    const insertedInfo = pick(this.serialize(), [
      '_id',
      'pid',
      'port',
      'dbPath',
      'startTime',
    ]);
    const runnerColl = client
      .db(isMongoS ? 'config' : 'local')
      .collection<
        Omit<SerializedServerProperties, 'hasInsertedMetadataCollEntry'>
      >('mongodbrunner');
    // mongos hosts require a bit of special treatment because they do not have
    // local storage of their own, so we store the metadata in the config database,
    // which may be accessed by multiple mongos instances.
    debug('ensuring metadata collection entry', insertedInfo, {
      isMongoS,
    });
    if (mode === 'insert-new') {
      const existingEntry = await runnerColl.findOne();
      if (!isMongoS && existingEntry) {
        throw new Error(
          `Unexpected mongodbrunner entry when creating new server: ${JSON.stringify(existingEntry)}`,
        );
      }
      await runnerColl.insertOne(insertedInfo);
      debug('inserted metadata collection entry', insertedInfo);
      this.hasInsertedMetadataCollEntry = true;
    } else {
      if (!this.hasInsertedMetadataCollEntry) {
        debug(
          'skipping metadata collection match check as we never inserted metadata',
        );
        return;
      }
      const match = await runnerColl.findOne(
        isMongoS ? { _id: this.uuid } : {},
      );
      debug('read metadata collection entry', insertedInfo, match);
      if (!match) {
        throw new Error(
          'Cannot find mongodbrunner entry, assuming that this instance was not started by mongodb-runner',
        );
      }
      if (match._id !== insertedInfo._id) {
        throw new Error(
          `Mismatched mongodbrunner entry: ${JSON.stringify(match)} !== ${JSON.stringify(insertedInfo)}`,
        );
      }
    }
  }

  private async _populateBuildInfo(
    mode: 'insert-new' | 'restore-check',
    clientOpts?: Partial<MongoClientOptions>,
  ): Promise<Error | null> {
    try {
      // directConnection + retryWrites let us write to `local` db on secondaries
      clientOpts = { retryWrites: false, ...clientOpts };
      if (
        this.keyFileContents &&
        (clientOpts.auth || this.defaultConnectionOptions?.auth)
      ) {
        clientOpts.auth = {
          username: '__system',
          password: this.keyFileContents,
        };
        clientOpts.authMechanism = 'SCRAM-SHA-256';
        // If enableTestCommands=true is set, we can use `admin` as the auth db on mongos
        // instances, otherwise we won't be able to insert at all
        // https://github.com/mongodb/mongo/blob/3faba053373cff4ff90ffce64114a595b9a70226/src/mongo/db/auth/sasl_mechanism_registry.cpp#L102-L108
        clientOpts.authSource = this.isMongos ? 'admin' : 'local';
      }
      this.buildInfo = await this.withClient(async (client) => {
        // Insert the metadata entry, except if we're a freshly started mongos
        // (which does not have its own storage to persist)
        await this._ensureMatchingMetadataColl(client, mode);
        return await client.db('admin').command({ buildInfo: 1 });
      }, clientOpts);
    } catch (err) {
      debug(
        'failed to get buildInfo, treating as closed server',
        err,
        new Error().stack,
      );
      return err as Error;
    }
    debug(
      'got server build info through client',
      this.serverVersion,
      this.serverVariant,
    );
    return null;
  }

  get connectionString(): string {
    return makeConnectionString(
      this.hostport,
      undefined,
      this.defaultConnectionOptions,
    );
  }

  async withClient<Fn extends (client: MongoClient) => any>(
    fn: Fn,
    clientOptions: MongoClientOptions = {},
  ): Promise<ReturnType<Fn>> {
    clientOptions = {
      directConnection: true,
      ...this.defaultConnectionOptions,
      ...clientOptions,
    };
    if (
      this.isArbiter &&
      clientOptions.auth &&
      clientOptions.auth.username !== '__system'
    ) {
      // Arbiters do not understand user authentication
      clientOptions.auth = undefined;
    }
    const client = await MongoClient.connect(
      this.connectionString,
      clientOptions,
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

  async assertHasInsertedLocalMetadata(): Promise<void> {
    if (!this.hasInsertedMetadataCollEntry) {
      debug('populating metadata collection entry after initial setup');
      const err = await this._populateBuildInfo('insert-new');
      if (err && !this.isMongos && !this.isConfigSvr) throw err;
    }
    if (!this.buildInfo) {
      throw new Error(
        `Server buildInfo is not populated ${JSON.stringify(this.serialize())}`,
      );
    }
    if (
      !this.hasInsertedMetadataCollEntry &&
      !this.isArbiter &&
      !this.isMongos &&
      !this.isConfigSvr
    ) {
      throw new Error(
        `Server has not inserted metadata collection entry ${JSON.stringify(this.serialize())}`,
      );
    }
  }
}
