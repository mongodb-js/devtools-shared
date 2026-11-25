import type { ChildProcess } from 'child_process';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import type { LogEntry } from './mongologreader';
import {
  createLogEntryIterator,
  filterLogStreamForBuildInfo,
  filterLogStreamForPort,
  isFailureToSetupListener,
} from './mongologreader';
import { Readable } from 'stream';
import type { FileTailStream } from './tail-file';
import { tailFileUntilExit } from './tail-file';
import type { Document, MongoClientOptions } from 'mongodb';
import { MongoClient, MongoServerError } from 'mongodb';
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
  eventually,
  hasPortArg,
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
  /** If set, each server writes its log to a file in this directory. */
  logDir?: string;
  /** Arguments to pass to the MongoDB binary. May or may not contain --port */
  args?: string[];
  /** Maximum time in milliseconds to wait for a server's listener line (default: 120_000). */
  startTimeoutMS?: number;
  /** Docker image or options to run the MongoDB binary in a container. */
  docker?: string | string[];
  /** The host address of the servers (default: '127.0.0.1') */
  host?: string;
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
  /**
   * Whether to spawn the server process detached from the current Node.js
   * process (default: `true`).
   *
   * When `true`, the server keeps running even if the parent process exits,
   * which is what the CLI relies on for its persistent-server behavior.
   *
   * Library consumers that manage the server lifetime within a single process
   * (e.g. test suites) can set this to `false` so the server is tied to the
   * parent process and terminated together with it. In particular, this avoids
   * orphaned `mongod` processes on Windows when the parent is killed without a
   * chance to call `close()` (e.g. an out-of-memory test worker).
   */
  detached?: boolean;
}

export interface SerializedServerProperties {
  _id: string;
  pid?: number;
  port?: number;
  host?: string;
  dbPath?: string;
  defaultConnectionOptions?: Partial<MongoClientOptions>;
  startTime: string;
  hasInsertedMetadataCollEntry: boolean;
  isArbiter?: boolean;
  isMongos?: boolean;
  isConfigSvr?: boolean;
  isDSC?: boolean;
  isAuth?: boolean;
  keyFileContents?: string;
  commandline?: string[];
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

function findLogDivertingArg(args?: string[]): string | undefined {
  if (!args) return undefined;
  for (const arg of args) {
    if (arg === '--syslog') return '--syslog';
    if (arg === '--logpath' || arg.startsWith('--logpath=')) return '--logpath';
  }
  return undefined;
}

/** Throws if the server's log would bypass the output the runner reads for its listener line. */
function rejectLogDivertingArgs(args?: string[]): void {
  const divertingArg = findLogDivertingArg(args);
  if (divertingArg) {
    throw new Error(
      `mongodb-runner cannot track server startup when ${divertingArg} is set; ` +
        "use the runner's logDir option instead",
    );
  }
}

const MONGOS_PORT_RETRY_LIMIT = 1000;

// How long a stream end without a listener line waits for the 'exit' event.
const EXIT_EVENT_GRACE_MS = 100;

// How long an exit waits for the log reader to deliver lines written just
// before the exit.
const EXIT_DRAIN_MS = 250;

/**
 * Races listener detection against process exit and a startup timeout. Exit
 * errors carry `errorLogEntries` for the mongos retry loop.
 */
function watchServerStartup(
  proc: ChildProcess,
  portPromise: Promise<{ port: number }>,
  opts: {
    binary: string;
    pid?: number;
    startTimeoutMS: number;
    errorLogEntries: LogEntry[];
    logFile?: string;
    logStreamEnded: Promise<void>;
  },
): Promise<{ port: number }> {
  const suffix = opts.logFile ? `; see ${opts.logFile}` : '';
  const makeExitError = (
    code: number | null,
    signal: NodeJS.Signals | null,
  ) => {
    const formattedErrors = opts.errorLogEntries
      .map((entry) => `${entry.message} ${JSON.stringify(entry.attr)}`)
      .join(', ');
    return Object.assign(
      new Error(
        `${opts.binary} (pid ${opts.pid ?? 'unknown'}) exited before reporting its listener ` +
          `(exit code ${String(code)}, signal ${String(signal)})${suffix}` +
          (formattedErrors ? `: ${formattedErrors}` : ''),
      ),
      { errorLogEntries: opts.errorLogEntries },
    );
  };
  let timer: NodeJS.Timeout | undefined;
  let onExit: (code: number | null, signal: NodeJS.Signals | null) => void;
  const exitPromise = new Promise<never>((_, reject) => {
    onExit = (code, signal) => {
      void Promise.race([opts.logStreamEnded, sleep(EXIT_DRAIN_MS)]).then(() =>
        reject(makeExitError(code, signal)),
      );
    };
    proc.once('exit', onExit);
    // 'exit' does not replay: a child that exited while _start was wiring
    // the log reader would otherwise lose its exit diagnosis to the
    // generic no-port error.
    if (proc.exitCode !== null || proc.signalCode !== null) {
      onExit(proc.exitCode, proc.signalCode);
    }
  });
  // A drained exit rejection can arrive after the race settled on the port
  // or timeout promise, so consume it to prevent an unhandled rejection.
  exitPromise.catch(() => undefined);
  // The pipe's EOF is observed before the process is reaped, so wait up to
  // EXIT_EVENT_GRACE_MS for 'exit' before falling back to the no-port error.
  const portOrExitPromise = portPromise.then(async ({ port }) => {
    if (port !== -1) {
      // The log reader can deliver a listener line after the process
      // exited; a server that exited is not started.
      if (proc.exitCode !== null || proc.signalCode !== null) {
        await exitPromise;
      }
      return { port };
    }
    await Promise.race([
      exitPromise.then(() => true),
      new Promise<false>((resolve) => {
        const graceTimer = setTimeout(
          () => resolve(false),
          EXIT_EVENT_GRACE_MS,
        );
        graceTimer.unref();
      }),
    ]);
    return { port };
  });
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new Error(
            `${opts.binary} (pid ${opts.pid ?? 'unknown'}) did not report its listener within ` +
              `${opts.startTimeoutMS}ms${suffix}`,
          ),
        ),
      opts.startTimeoutMS,
    );
    timer.unref();
  });
  return Promise.race([portOrExitPromise, exitPromise, timeoutPromise]).finally(
    () => {
      clearTimeout(timer);
      proc.removeListener('exit', onExit);
    },
  );
}

function isUnauthorizedError(err: unknown): boolean {
  return (
    err instanceof MongoServerError &&
    (err.codeName === 'Unauthorized' || Number(err.code) === 13)
  );
}

export class MongoServer extends EventEmitter<MongoServerEvents> {
  public uuid: string = uuid();
  private buildInfo?: Document;
  private childProcess?: ChildProcess;
  private logTail?: FileTailStream;
  private pid?: number;
  private host = '127.0.0.1';
  private port?: number;
  private dbPath?: string;
  private closing = false;
  private startTime = new Date().toISOString();
  private hasInsertedMetadataCollEntry = false;
  public isArbiter = false;
  public isMongos = false;
  private isConfigSvr = false;
  // Whether this server uses DSC. DSC servers do not
  // allow writes to the `local` database, so metadata tracking is skipped.
  private isDSC = false;
  // Whether this server was started with --auth. Its metadata bookkeeping is
  // best-effort because the runner may not have credentials it can use.
  public isAuth = false;
  private _keyFileContents?: string;
  private defaultConnectionOptions?: Partial<MongoClientOptions>;
  private commandline: string[] = [];

  get id(): string {
    return this.uuid;
  }

  /**
   * The contents of the keyfile this server was started with, if any. Can be
   * used to authenticate as the internal `__system` user (whose password is
   * the keyfile contents) for administrative commands that the localhost
   * exception does not permit.
   */
  get keyFileContents(): string | undefined {
    return this._keyFileContents;
  }

  set keyFileContents(contents: string | undefined) {
    this._keyFileContents = contents;
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
      host: this.host,
      dbPath: this.dbPath,
      startTime: this.startTime,
      hasInsertedMetadataCollEntry: this.hasInsertedMetadataCollEntry,
      defaultConnectionOptions: jsonClone(this.defaultConnectionOptions ?? {}),
      isArbiter: this.isArbiter,
      isMongos: this.isMongos,
      isConfigSvr: this.isConfigSvr,
      isDSC: this.isDSC,
      isAuth: this.isAuth,
      keyFileContents: this.keyFileContents,
      commandline: this.commandline,
    };
  }

  static async deserialize(
    serialized: SerializedServerProperties,
  ): Promise<MongoServer> {
    const srv = new MongoServer();
    srv.uuid = serialized._id;
    srv.port = serialized.port;
    if (serialized.host) {
      srv.host = serialized.host;
    }
    srv.defaultConnectionOptions = serialized.defaultConnectionOptions;
    // Set before _populateBuildInfo so the restore check skips the
    // local-database metadata access for DSC servers.
    srv.isDSC = !!serialized.isDSC;
    srv.closing = !!(await srv._populateBuildInfo('restore-check'));
    srv.isArbiter = !!serialized.isArbiter;
    srv.isMongos = !!serialized.isMongos;
    srv.isConfigSvr = !!serialized.isConfigSvr;
    srv.isAuth = !!serialized.isAuth;
    srv.keyFileContents = serialized.keyFileContents;
    srv.commandline = serialized.commandline ?? [];
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
    return `${this.host}:${this.port}`;
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
    rejectLogDivertingArgs(options.args);
    if (options.binary === 'mongos' && !hasPortArg(options.args)) {
      // SERVER-78384: mongos before 7.1.0 does not understand `--port 0`, so
      // pick a random port in [1025, 49151) and retry on listener-setup failure.
      const minPort = 1025;
      const maxPort = 49151;
      let port = Math.floor(Math.random() * (maxPort - minPort) + minPort);
      let lastError: unknown;
      for (let attempts = 0; attempts < MONGOS_PORT_RETRY_LIMIT; attempts++) {
        try {
          debug('Trying to spawn mongos on port', port);
          return await this._start({
            ...options,
            args: [...(options.args ?? []), '--port', String(port)],
          });
        } catch (err) {
          lastError = err;
          const logEntries: LogEntry[] = (err as any).errorLogEntries ?? [];
          if (logEntries.some(isFailureToSetupListener)) {
            port = port === maxPort ? minPort : port + 1;
            continue;
          }
          throw err;
        }
      }
      throw new Error(
        `mongos could not find a free port after ${MONGOS_PORT_RETRY_LIMIT} attempts; ` +
          `last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
      );
    }
    return await this._start(options);
  }

  static async _start({
    ...options
  }: MongoServerOptions): Promise<MongoServer> {
    rejectLogDivertingArgs(options.args);
    const srv = new MongoServer();
    srv.defaultConnectionOptions = { ...options.internalClientOptions };
    srv.isArbiter = !!options.isArbiter;
    srv.isMongos = options.binary === 'mongos';
    srv.isConfigSvr = !!options.args?.includes('--configsvr');
    srv.isDSC = !!options.args?.includes('disaggregatedStorageEnabled=true');
    const keyFilePath = getKeyFileOption(options.args);
    // A keyfile implicitly enables authentication, same as --auth.
    srv.isAuth =
      !!options.args?.includes('--auth') || keyFilePath !== undefined;
    if (options.host) {
      // All servers, including config servers, honor `host`. PR #620
      // (DRIVERS-3335) excluded config servers after sharded driver test
      // builds timed out when they advertised `localhost`, but that failure
      // was never diagnosed and could not be reproduced: sharded clusters
      // whose config server replset advertises `localhost` work (verified
      // with mongod/mongos 8.0, covered by the "can use localhost as the
      // host" sharded cluster test).
      srv.host = options.host;
    }
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
    if (!hasPortArg(options.args)) commandline.push('--port', '0');
    if (!options.args?.includes('--dbpath') && options.binary === 'mongod')
      commandline.push('--dbpath', options.docker ? '/tmp' : srv.dbPath!);
    if (
      !options.args?.includes('--unixSocketPrefix') &&
      process.platform !== 'win32'
    )
      commandline.push('--nounixsocket');

    debug('starting server', commandline);
    const [executable, ...args] = commandline;
    srv.commandline = commandline;
    const startTimeoutMS = options.startTimeoutMS ?? 120_000;
    let outFile: string | undefined;
    let proc: ChildProcess;
    let stdout: Readable;
    if (options.logDir) {
      // The server writes straight to the file rather than through a pipe to
      // this process, so it keeps logging after we exit (`start` exits once the
      // cluster is up). We follow the file to see the startup output instead.
      await fs.mkdir(options.logDir, { recursive: true });
      outFile = path.join(
        options.logDir,
        `${options.binary}-${srv.uuid}-${new Date()
          .toISOString()
          .replace(/[^-_a-zA-Z0-9.]/g, '')}.log`,
      );
      const handle = await fs.open(outFile, 'a');
      try {
        proc = spawn(executable, args, {
          stdio: ['inherit', handle.fd, handle.fd],
          cwd: options.tmpDir,
          detached: options.detached ?? true,
        });
        await once(proc, 'spawn');
      } finally {
        await handle.close(); // the child process holds its own copy
      }
      srv.childProcess = proc;
      srv.pid = proc.pid;
      srv.logTail = tailFileUntilExit(outFile, proc);
      stdout = srv.logTail;
    } else {
      const pipedProc = spawn(executable, args, {
        stdio: ['inherit', 'pipe', 'pipe'],
        cwd: options.tmpDir,
        detached: options.detached ?? true,
      });
      proc = pipedProc;
      await once(proc, 'spawn');
      srv.childProcess = proc;
      srv.pid = proc.pid;
      stdout = pipedProc.stdout;
      pipedProc.stderr.setEncoding('utf8');
      pipedProc.stderr.on('data', (chunk) => debug('server stderr', chunk));
      pipedProc.stderr.resume();
      stdout.resume();
    }

    const errorLogEntries: LogEntry[] = [];
    try {
      const logEntryStream = Readable.from(createLogEntryIterator(stdout));
      const logStreamEnded = new Promise<void>((resolve) =>
        logEntryStream.once('end', () => resolve()),
      );
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
          ((srv.buildInfo = buildInfo),
            debug(
              'got server build info from log',
              srv.serverVersion,
              srv.serverVariant,
            ));
        },
        () => {
          /* ignore error */
        },
      );
      const { port } = await watchServerStartup(
        proc,
        filterLogStreamForPort(logEntryStream),
        {
          binary: options.binary,
          pid: srv.pid,
          startTimeoutMS,
          errorLogEntries,
          logFile: outFile,
          logStreamEnded,
        },
      );
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
        // Bounded by startTimeoutMS so an unresponsive server cannot stall
        // the start, but a nonzero timeout from the caller's own client wins
        // when shorter.
        const configured = options.internalClientOptions ?? {};
        const buildInfoError = await srv._populateBuildInfo('insert-new', {
          timeoutMS:
            configured.timeoutMS && configured.timeoutMS > 0
              ? Math.min(configured.timeoutMS, startTimeoutMS)
              : startTimeoutMS,
          // MongoClient.connect ignores timeoutMS (the driver bounds
          // selection retries and socket connects with these two instead),
          // so cap them by the startup bound as well.
          serverSelectionTimeoutMS: Math.min(
            configured.serverSelectionTimeoutMS ?? startTimeoutMS,
            startTimeoutMS,
          ),
          connectTimeoutMS: Math.min(
            configured.connectTimeoutMS ?? startTimeoutMS,
            startTimeoutMS,
          ),
        });
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
    retryOptions?: { intervalMs?: number; timeoutMs?: number },
  ): Promise<void> {
    if (this.isDSC) {
      // DSC servers do not allow writes to the `local`
      // database, so metadata tracking is not possible there.
      debug('skipping metadata check for DSC server');
      return;
    }
    let hello = await client.db('admin').command({ hello: 1 });
    if (this.isArbiter) {
      // RS convergence: hello.arbiterOnly may lag behind the RS config while the
      // member transitions to ARBITER state. Retry until confirmed or timeout.
      if (!hello.arbiterOnly) {
        await eventually(
          async () => {
            hello = await client.db('admin').command({ hello: 1 });
            if (!hello.arbiterOnly) {
              throw new Error(
                'Arbiter flag mismatch -- server should be arbiter but hello indicates it is not',
              );
            }
          },
          retryOptions ?? { intervalMs: 500, timeoutMs: 30_000 },
        );
      }
      debug('skipping metadata check for confirmed arbiter');
      return;
    }
    if (hello.arbiterOnly) {
      // isArbiter may not be set yet (e.g. during deserialize where it is
      // assigned after _populateBuildInfo); skip metadata check.
      debug('skipping metadata check for arbiter');
      return;
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
    this.logTail?.ref();
    (this.childProcess?.stdout as any)?.ref();
    (this.childProcess?.stderr as any)?.ref();
  }

  unref(): void {
    this.childProcess?.unref();
    this.logTail?.unref();
    (this.childProcess?.stdout as any)?.unref();
    (this.childProcess?.stderr as any)?.unref();
  }

  async assertHasInsertedLocalMetadata(): Promise<void> {
    if (!this.hasInsertedMetadataCollEntry) {
      debug('populating metadata collection entry after initial setup');
      const err = await this._populateBuildInfo('insert-new');
      if (err && isUnauthorizedError(err)) {
        if (!this.isAuth) {
          // Without --auth, an Unauthorized response means we cannot tell
          // whether this is the instance we intended to talk to, so it stays
          // fatal regardless of topology.
          throw err;
        }
        // --auth servers may not have users the runner can use for bookkeeping.
        debug(
          'cannot populate metadata collection entry, server requires authentication',
          err,
        );
        return;
      }
      if (err && !this.isMongos && !this.isConfigSvr && !this.isDSC) throw err;
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
      !this.isConfigSvr &&
      !this.isDSC
    ) {
      throw new Error(
        `Server has not inserted metadata collection entry ${JSON.stringify(this.serialize())}`,
      );
    }
  }
}
