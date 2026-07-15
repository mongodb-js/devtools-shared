import type { MongoServerEvents, MongoServerOptions } from './mongoserver';
import { MongoServer } from './mongoserver';
import { ConnectionString } from 'mongodb-connection-string-url';
import type { DownloadOptions } from '@mongodb-js/mongodb-downloader';
import { downloadMongoDb } from '@mongodb-js/mongodb-downloader';
import type {
  Document,
  MongoClientOptions,
  TagSet,
  WriteConcernSettings,
} from 'mongodb';
import { MongoClient } from 'mongodb';
import {
  sleep,
  range,
  uuid,
  debug,
  jsonClone,
  debugVerbose,
  makeConnectionString,
  safePromiseAll,
  hasPortArg,
  allocatePort,
} from './util';
import { OIDCMockProviderProcess } from './oidc';
import { DockerComposeProject } from './docker-compose';
import { EventEmitter } from 'events';
import assert from 'assert';
import { handleTLSClientKeyOptions } from './tls-helpers';

/**
 * Description of a MongoDB user account that will be created in a test cluster.
 */
export interface MongoDBUserDoc {
  /**
   * SCRAM-SHA-256 username.
   */
  username: string;
  /**
   * SCRAM-SHA-256 password.
   */
  password: string;
  /**
   * Additional metadata for a given user.
   */
  customData?: Document;
  /**
   * Roles to assign to the user.
   */
  roles: ({ role: string; db?: string } | string)[];
  /**
   * Additional fields may be included as per the `createUser` command.
   */
  [key: string]: unknown;
}

/** Describe the individual members of a replica set */
export interface RSMemberOptions {
  /**
   * Tags to assign to the member, in the format expected by the Node.js driver.
   */
  tags?: TagSet;
  /**
   * Priority of the member. If none is specified, one member will be given priority 1
   * and all others priority 0. The mongodb-runner package assumes that the highest priority
   * member will become primary.
   */
  priority?: number;
  /**
   * Additional arguments for the member.
   */
  args?: string[];
  /**
   * Whether the member is an arbiter.
   */
  arbiterOnly?: boolean;
}

/**
 * Shared options for all cluster topologies.
 */
export interface CommonOptions {
  /**
   * Directory where server binaries will be downloaded and stored.
   */
  downloadDir?: string;
  /**
   * Various options to control the download of MongoDB binaries.
   */
  downloadOptions?: DownloadOptions;

  /**
   * OIDC mock provider command line (e.g. '--port=0' or full path to binary).
   * If provided, an OIDC mock provider will be started alongside the cluster,
   * and the necessary parameters to connect to it will be added to the
   * cluster's mongod/mongos processes.
   */
  oidc?: string;

  /**
   * MongoDB server version to download and use (e.g. '6.0.3', '8.x-enterprise', 'latest-alpha', etc.)
   */
  version?: string;
  /**
   * A direct URL to a MongoDB tarball to download and use. Takes precedence
   * over `version`.
   */
  downloadUrl?: string;
  /**
   * User accounts to create after starting the cluster.
   */
  users?: MongoDBUserDoc[];

  /**
   * Whether to automatically add an additional TLS client certificate key file
   * to the cluster nodes based on whether TLS configuration was detected.
   *
   * Adding this is required in order for authentication to work when TLS is enabled.
   */
  tlsAddClientKey?: boolean;

  /**
   * Whether to require an API version for commands.
   */
  requireApiVersion?: number;

  /**
   * Topology of the cluster.
   */
  topology: 'standalone' | 'replset' | 'sharded';

  /**
   * When set, starts a docker compose project providing a DSC
   * backend before spawning any mongod processes, and injects
   * `--setParameter disaggregatedStorageConfig=...` into each one.
   */
  disaggregatedStorage?: DisaggregatedStorageOptions;
}

/**
 * Options specific to replica set clusters.
 */
export type RSOptions = {
  /** Number of arbiters to create (default: 0) */
  arbiters?: number;
  /** Number of secondary nodes to create (default: 2) */
  secondaries?: number;
  /** Explicitly specify replica set members. If set, `arbiters` and `secondaries` will be ignored. */
  rsMembers?: RSMemberOptions[];
};

export type ShardedOptions = {
  /** Arguments to pass to each mongos instance. */
  mongosArgs?: string[][];
  /** Number of shards to create or explicit shard configurations. */
  shards?: number | Partial<MongoClusterOptions>[];
};

/** A replica set member of a shard, with its pre-allocated port. */
export interface ShardMemberDescriptor {
  host: string;
  port: number;
  priority: number;
}

/** Identifies a shard within a cluster for DSC setup. */
export interface ShardDescriptor {
  /** Zero-based shard index. In a sharded cluster, 0 is the config server. */
  index: number;
  /** True only for the dedicated config server replset in a sharded cluster. */
  isConfigServer: boolean;
  /** The replica set name (absent for standalone topologies). */
  replSetName?: string;
  /**
   * The members of this shard with their pre-allocated ports. With
   * DSC, ports are allocated before the servers start so
   * that the storage configuration can reference them.
   */
  members: ShardMemberDescriptor[];
}

/**
 * Options for DSC support. When provided, mongodb-runner will
 * launch a docker compose project providing the storage backend, then call the
 * supplied hooks before starting mongod processes.
 */
export interface DisaggregatedStorageOptions {
  /** Path to the docker-compose.yml file for the storage backend. */
  composeFile: string;

  /**
   * Environment variables used for variable interpolation in the compose file
   * (e.g. image repository/tag and host port mappings). Merged over the
   * current process environment.
   */
  env?: Record<string, string>;

  /**
   * Value for `--setParameter disaggregatedStorageConfig=...` injected into
   * every mongod, including the config server. Accepts a per-shard function
   * to produce different values per shard (e.g. different bucket names).
   */
  config:
    | string
    | Record<string, unknown>
    | ((shard: ShardDescriptor) => string | Record<string, unknown>);

  /**
   * Called once after `docker compose up` returns, before any mongod starts.
   * Should poll/retry until the storage layer is ready to accept connections.
   */
  waitForReady?: () => Promise<void>;

  /**
   * Called once per shard before that shard's mongod processes start.
   * Should create any resources (buckets, namespaces, etc.) needed by that shard.
   * For standalone/replset topologies, called once with index=0, isConfigServer=false.
   */
  setupShard?: (shard: ShardDescriptor) => Promise<void>;
}

export type MongoClusterOptions = Pick<
  MongoServerOptions,
  | 'logDir'
  | 'tmpDir'
  | 'args'
  | 'binDir'
  | 'docker'
  | 'internalClientOptions'
  | 'host'
  | 'detached'
> &
  CommonOptions &
  RSOptions &
  ShardedOptions;

export type MongoClusterEvents = {
  [k in keyof MongoServerEvents]: [serverUUID: string, ...MongoServerEvents[k]];
} & {
  newListener: [keyof MongoClusterEvents];
  removeListener: [keyof MongoClusterEvents];
};

function removePortArg([...args]: string[]): string[] {
  let portArgIndex = -1;
  if ((portArgIndex = args.indexOf('--port')) !== -1) {
    args.splice(portArgIndex, 2);
  } else if (
    (portArgIndex = args.findIndex((arg) => arg.startsWith('--port='))) !== -1
  ) {
    args.splice(portArgIndex, 1);
  }
  return args;
}

function processRSMembers(options: MongoClusterOptions): {
  rsMembers: RSMemberOptions[];
  replSetName: string;
} {
  const {
    secondaries = 2,
    arbiters = 0,
    args: [...args] = [],
    rsMembers,
  } = options;

  let replSetName: string;
  if (!args.includes('--replSet')) {
    replSetName = `replSet-${uuid()}`;
    args.push('--replSet', replSetName);
  } else {
    replSetName = args[args.indexOf('--replSet') + 1];
  }

  const primaryArgs: string[] = [...args];
  const secondaryArgs = [...removePortArg(args), '--port', '0'];

  if (rsMembers) {
    const primary = rsMembers.find((m) =>
      rsMembers.every((m2) => m.priority ?? 0 >= (m2.priority ?? 0)),
    );
    return {
      rsMembers: rsMembers.map((m) => ({
        ...m,
        args: [
          ...(m.args ?? []),
          ...(hasPortArg(m.args)
            ? args
            : m === primary
              ? primaryArgs
              : secondaryArgs),
        ],
      })),
      replSetName,
    };
  }

  return {
    rsMembers: [
      { priority: 1, args: primaryArgs },
      ...range(secondaries).map(() => ({ priority: 0, args: secondaryArgs })),
      ...range(arbiters).map(() => ({
        priority: 0,
        arbiterOnly: true,
        args: secondaryArgs,
      })),
    ],
    replSetName,
  };
}

function buildDisaggregatedArgs(
  ds: DisaggregatedStorageOptions,
  shard: ShardDescriptor,
  baseArgs: string[],
): string[] {
  const raw = typeof ds.config === 'function' ? ds.config(shard) : ds.config;
  const value = typeof raw === 'string' ? raw : JSON.stringify(raw);
  return [
    ...baseArgs,
    '--setParameter',
    `disaggregatedStorageConfig=${value}`,
    '--setParameter',
    'disaggregatedStorageEnabled=true',
  ];
}

/** Remove any `--port <n>` / `--port=<n>` argument, flag included. */
function stripPortArg(args: string[]): string[] {
  return removePortArg(args).filter((arg) => arg !== '--port');
}

/** Return the value of a `--port <n>` / `--port=<n>` argument, if any. */
function getPortArg(args: string[] | undefined): number | undefined {
  if (!args) return undefined;
  const splitArgIndex = args.indexOf('--port');
  if (splitArgIndex !== -1) return +args[splitArgIndex + 1] || undefined;
  const arg = args.find((a) => a.startsWith('--port='));
  return arg ? +arg.split('=')[1] || undefined : undefined;
}

function processShardOptions(options: MongoClusterOptions): {
  shards: Partial<MongoClusterOptions>[];
  mongosArgs: string[][];
} {
  const shards: Partial<MongoClusterOptions>[] =
    typeof options.shards === 'number' || !options.shards
      ? range((options.shards ?? 3) + 1).map(
          () => ({}) as Partial<MongoClusterOptions>,
        )
      : options.shards;
  const { mongosArgs = [[]], args: mainArgs = [] } = options;
  return {
    shards: shards.map(({ args = [], ...perShardOpts }, i) => ({
      ...perShardOpts,
      args: [
        ...removePortArg(mainArgs),
        ...args,
        ...(args.includes('--configsvr') || args.includes('--shardsvr')
          ? []
          : i === 0
            ? ['--configsvr']
            : ['--shardsvr']),
      ],
    })),
    mongosArgs: mongosArgs.map((perMongosArgs, i) => [
      ...(i === 0 && !hasPortArg(perMongosArgs)
        ? mainArgs
        : removePortArg(mainArgs)),
      ...perMongosArgs,
    ]),
  };
}

export class MongoCluster extends EventEmitter<MongoClusterEvents> {
  private topology: MongoClusterOptions['topology'] = 'standalone';
  private replSetName?: string;
  private servers: MongoServer[] = []; // mongod/mongos
  private shards: MongoCluster[] = []; // replsets
  private oidcMockProviderProcess?: OIDCMockProviderProcess;
  private dockerComposeProject?: DockerComposeProject;
  private defaultConnectionOptions: Partial<MongoClientOptions> = {};
  private users: MongoDBUserDoc[] = [];

  private constructor() {
    super();
    // NB: This will not retroactively add listeners to new server instances.
    // This should be fine, as we only pass "fully initialized" clusters to
    // callers, with all child clusters and individual servers already in place.
    this.on('newListener', (name) => {
      if (name === 'newListener' || name === 'removeListener') return;
      if (this.listenerCount(name) === 0) {
        for (const child of this.servers)
          child.on(name, (...args) => this.emit(name, child.id, ...args));
        for (const child of this.shards)
          child.on(name, (...args) => this.emit(name, ...args));
      }
    });
    /* see .start() */
  }

  private static downloadMongoDb(
    tmpdir: string,
    targetVersionSemverSpecifier?: string | undefined,
    options?: DownloadOptions | undefined,
    downloadUrl?: string | undefined,
  ): Promise<string> {
    return downloadMongoDb({
      directory: tmpdir,
      version: targetVersionSemverSpecifier,
      downloadOptions: options,
      useLockfile: true,
      downloadUrl,
    });
  }

  serialize(): unknown /* JSON-serializable */ {
    return {
      topology: this.topology,
      replSetName: this.replSetName,
      servers: this.servers.map((srv) => srv.serialize()),
      shards: this.shards.map((shard) => shard.serialize()),
      oidcMockProviderProcess: this.oidcMockProviderProcess?.serialize(),
      dockerComposeProject: this.dockerComposeProject?.serialize(),
      defaultConnectionOptions: jsonClone(this.defaultConnectionOptions ?? {}),
      users: jsonClone(this.users),
    };
  }

  isClosed(): boolean {
    // Return true if and only if there are no running sub-clusters/servers
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const _ of this.children()) return true;
    return true;
  }

  static async deserialize(serialized: any): Promise<MongoCluster> {
    const cluster = new MongoCluster();
    cluster.topology = serialized.topology;
    cluster.replSetName = serialized.replSetName;
    cluster.defaultConnectionOptions = serialized.defaultConnectionOptions;
    cluster.users = serialized.users;
    cluster.servers = await safePromiseAll(
      serialized.servers.map((srv: any) => MongoServer.deserialize(srv)),
    );
    cluster.shards = await safePromiseAll(
      serialized.shards.map((shard: any) => MongoCluster.deserialize(shard)),
    );
    cluster.oidcMockProviderProcess = serialized.oidcMockProviderProcess
      ? OIDCMockProviderProcess.deserialize(serialized.oidcMockProviderProcess)
      : undefined;
    cluster.dockerComposeProject = serialized.dockerComposeProject
      ? DockerComposeProject.deserialize(serialized.dockerComposeProject)
      : undefined;
    return cluster;
  }

  get hostport(): string {
    return this.servers.map((srv) => srv.hostport).join(',');
  }

  get connectionString(): string {
    return makeConnectionString(
      this.hostport,
      this.replSetName,
      this.defaultConnectionOptions,
    );
  }

  get oidcIssuer(): string | undefined {
    return this.oidcMockProviderProcess?.issuer;
  }

  get connectionStringUrl(): ConnectionString {
    return new ConnectionString(this.connectionString);
  }

  get serverVersion(): string {
    return this.servers[0].serverVersion;
  }

  get serverVariant(): 'enterprise' | 'community' {
    return this.servers[0].serverVariant;
  }

  static async start(
    { ...options }: MongoClusterOptions,
    // Internal parameter used when starting the shards of a sharded cluster:
    // the parent cluster owns the docker compose project, and the shards
    // inherit the DSC context from it.
    _internal?: {
      disaggregatedStorage: DisaggregatedStorageOptions;
      shardContext: { index: number; isConfigServer: boolean };
    },
  ): Promise<MongoCluster> {
    options = { ...options, ...(await handleTLSClientKeyOptions(options)) };

    const cluster = new MongoCluster();
    cluster.topology = options.topology;
    cluster.users = options.users ?? [];
    cluster.defaultConnectionOptions = { ...options.internalClientOptions };
    if (!options.binDir) {
      options.binDir = await this.downloadMongoDb(
        options.downloadDir ?? options.tmpDir,
        options.version,
        options.downloadOptions,
        options.downloadUrl,
      );
    }

    if (options.oidc !== undefined) {
      cluster.oidcMockProviderProcess = await OIDCMockProviderProcess.start(
        options.oidc || '--port=0',
      );
      const oidcServerConfig = [
        {
          issuer: cluster.oidcMockProviderProcess.issuer,
          audience: cluster.oidcMockProviderProcess.audience,
          authNamePrefix: 'dev',
          clientId: 'cid',
          authorizationClaim: 'groups',
        },
      ];
      delete options.oidc;
      options.args = [
        ...(options.args ?? []),
        '--setParameter',
        `oidcIdentityProviders=${JSON.stringify(oidcServerConfig)}`,
        '--setParameter',
        'authenticationMechanisms=SCRAM-SHA-256,MONGODB-OIDC',
        '--setParameter',
        'enableTestCommands=true',
      ];
    }

    let disaggregatedStorage = _internal?.disaggregatedStorage;
    if (!disaggregatedStorage && options.disaggregatedStorage) {
      disaggregatedStorage = options.disaggregatedStorage;
      delete options.disaggregatedStorage;
      cluster.dockerComposeProject = await DockerComposeProject.start(
        disaggregatedStorage.composeFile,
        { env: disaggregatedStorage.env },
      );
    }

    try {
      if (disaggregatedStorage) {
        if (cluster.dockerComposeProject) {
          // Only the compose-owning (top-level) cluster waits for readiness.
          await disaggregatedStorage.waitForReady?.();
        }
        if (options.secondaries === undefined) options.secondaries = 1;
      }
      return await this._startServers(
        cluster,
        options,
        disaggregatedStorage,
        _internal?.shardContext ?? { index: 0, isConfigServer: false },
      );
    } catch (err) {
      // Don't leak the compose project if cluster setup fails partway through.
      if (cluster.dockerComposeProject) {
        try {
          await cluster.dockerComposeProject.close();
        } catch {
          /* ignore */
        }
      }
      throw err;
    }
  }

  private static async _startServers(
    cluster: MongoCluster,
    options: MongoClusterOptions,
    disaggregatedStorage: DisaggregatedStorageOptions | undefined,
    shardContext: { index: number; isConfigServer: boolean },
  ): Promise<MongoCluster> {
    if (options.topology === 'standalone') {
      if (disaggregatedStorage) {
        // Pre-allocate the port so the storage configuration can reference it.
        let port = getPortArg(options.args);
        if (!port) {
          port = await allocatePort();
          options.args = [
            ...stripPortArg(options.args ?? []),
            '--port',
            String(port),
          ];
        }
        const descriptor: ShardDescriptor = {
          ...shardContext,
          members: [{ host: options.host ?? '127.0.0.1', port, priority: 1 }],
        };
        await disaggregatedStorage.setupShard?.(descriptor);
        options.args = buildDisaggregatedArgs(
          disaggregatedStorage,
          descriptor,
          options.args ?? [],
        );
      }
      cluster.servers.push(
        await MongoServer.start({
          ...options,
          binary: 'mongod',
        }),
      );
    } else if (options.topology === 'replset') {
      const { rsMembers, replSetName } = processRSMembers(options);
      if (disaggregatedStorage) {
        // Pre-allocate member ports so the storage configuration (which
        // embeds the replica set config, including member host:ports) can be
        // computed before the servers start.
        const members: ShardMemberDescriptor[] = [];
        for (const member of rsMembers) {
          let port = getPortArg(member.args);
          if (!port) {
            port = await allocatePort();
            member.args = [
              ...stripPortArg(member.args ?? []),
              '--port',
              String(port),
            ];
          }
          members.push({
            host: options.host ?? '127.0.0.1',
            port,
            priority: member.priority ?? 0,
          });
        }
        const descriptor: ShardDescriptor = {
          ...shardContext,
          replSetName,
          members,
        };
        await disaggregatedStorage.setupShard?.(descriptor);
        for (const member of rsMembers) {
          member.args = buildDisaggregatedArgs(
            disaggregatedStorage,
            descriptor,
            member.args ?? [],
          );
        }
      }

      debug('Starting replica set nodes', {
        replSetName,
        secondaries: rsMembers.filter((m) => !m.arbiterOnly).length - 1,
        arbiters: rsMembers.filter((m) => m.arbiterOnly).length,
      });
      const primaryIndex = rsMembers.findIndex((m) =>
        rsMembers.every((m2) => m.priority ?? 0 >= (m2.priority ?? 0)),
      );
      assert.notStrictEqual(primaryIndex, -1);

      const nodes = await safePromiseAll(
        rsMembers.map(async (member) => {
          return [
            await MongoServer.start({
              ...options,
              args: member.args,
              isArbiter: member.arbiterOnly ?? false,
              binary: 'mongod',
            }),
            member,
          ] as const;
        }),
      );
      cluster.servers.push(...nodes.map(([srv]) => srv));
      const primary = cluster.servers[primaryIndex];

      await primary.withClient(async (client) => {
        // With DSC, the replica set config is provided to
        // the servers at startup (disaggregatedStorageConfig.replSetConfig)
        // and replSetInitiate is not supported.
        if (!disaggregatedStorage) {
          debug('Running rs.initiate');
          const rsConf = {
            _id: replSetName,
            configsvr: rsMembers.some((m) => m.args?.includes('--configsvr')),
            members: nodes.map(([srv, member], i) => {
              return {
                _id: i,
                host: srv.hostport,
                arbiterOnly: member.arbiterOnly ?? false,
                priority: member.priority ?? (i === primaryIndex ? 1 : 0),
                tags: member.tags || {},
              };
            }),
          };
          debugVerbose('replSetInitiate:', rsConf);
          await client.db('admin').command({
            replSetInitiate: rsConf,
          });
        }

        for (let i = 0; i < 60; i++) {
          const status = await client.db('admin').command({
            replSetGetStatus: 1,
          });
          if (
            status.members.some((member: any) => member.stateStr === 'PRIMARY')
          ) {
            debug(
              'rs.status indicated primary for replset',
              status.set,
              status.members,
            );
            cluster.replSetName = status.set;
            break;
          }
          debug('rs.status did not include primary, waiting...');
          await sleep(1000);
        }
      });
    } else if (options.topology === 'sharded') {
      const { shards, mongosArgs } = processShardOptions(options);
      debug('starting config server and shard servers', shards);
      const allShards = await safePromiseAll(
        shards.map(async (s, i) => {
          const isConfigServer = s.args?.includes('--configsvr') ?? false;
          // The per-shard DSC setup (setupShard, config
          // injection) happens inside the recursive replset start, where the
          // member ports are known.
          const shardCluster = await MongoCluster.start(
            {
              ...options,
              ...s,
              topology: 'replset',
              requireApiVersion: undefined,
              users: isConfigServer ? undefined : options.users,
            },
            disaggregatedStorage
              ? {
                  disaggregatedStorage,
                  shardContext: { index: i, isConfigServer },
                }
              : undefined,
          );
          return [shardCluster, isConfigServer] as const;
        }),
      );
      const configsvr = allShards.find(([, isConfig]) => isConfig)![0];
      const shardsvrs = allShards
        .filter(([, isConfig]) => !isConfig)
        .map(([shard]) => shard);
      cluster.shards.push(configsvr, ...shardsvrs);

      const mongosServers: MongoServer[] = await safePromiseAll(
        mongosArgs.map(async (args) => {
          debug('starting mongos');
          return await MongoServer.start({
            ...options,
            binary: 'mongos',
            args: [
              ...args,
              '--configdb',
              `${configsvr.replSetName!}/${configsvr.hostport}`,
            ],
          });
        }),
      );
      cluster.servers.push(...mongosServers);
      const mongos = mongosServers[0];
      await mongos.withClient(async (client) => {
        for (const shard of shardsvrs) {
          const shardSpec = `${shard.replSetName!}/${shard.hostport}`;
          debug('adding shard', shardSpec);
          await client.db('admin').command({
            addShard: shardSpec,
          });
        }
        debug('added shards');
      });
    }

    await cluster.addAuthIfNeeded();
    await cluster.addRequireApiVersionIfNeeded(options);
    try {
      await cluster.assertAllServersHaveInsertedLocalMetadata();
    } catch (err) {
      // Allow connection errors if automatic tls client key addition is disabled
      // since that option implies to users that they are taking responsibility for
      // ensuring that the correct runner instance is used for managing processes.
      // Similarly, adding TLS client keys automatically in Docker may not be
      // reliably possible due to filesystem path differences.
      if (options.tlsAddClientKey !== false && !options.docker) throw err;
    }
    return cluster;
  }

  private *children(): Iterable<MongoServer | MongoCluster> {
    yield* this.servers;
    yield* this.shards;
  }

  private *allServers(): Iterable<MongoServer> {
    for (const child of this.servers) yield child;
    for (const shard of this.shards) yield* shard.allServers();
  }

  async assertAllServersHaveInsertedLocalMetadata(): Promise<void> {
    await safePromiseAll(
      [...this.allServers()].map(
        async (server) => await server.assertHasInsertedLocalMetadata(),
      ),
    );
  }

  async addRequireApiVersionIfNeeded({
    ...options
  }: MongoClusterOptions): Promise<void> {
    // Set up requireApiVersion if requested.
    if (options.requireApiVersion === undefined) {
      return;
    }
    if (options.topology === 'replset') {
      throw new Error(
        'requireApiVersion is not supported for replica sets, see SERVER-97010',
      );
    }
    await safePromiseAll(
      [...this.servers].map(
        async (child) =>
          await child.withClient(async (client) => {
            const admin = client.db('admin');
            await admin.command({ setParameter: 1, requireApiVersion: true });
          }),
      ),
    );
    await this.updateDefaultConnectionOptions({
      serverApi: String(options.requireApiVersion) as '1',
    });
  }

  async addAuthIfNeeded(): Promise<void> {
    if (!this.users?.length) return;
    // Sleep to give time for a possible replset election to settle.
    await sleep(1000);
    await this.withClient(async (client) => {
      const admin = client.db('admin');
      for (const user of this.users) {
        const { username, password, ...rest } = user;
        debug('adding new user', { username, ...rest }, this.connectionString);
        await admin.command({
          createUser: username,
          pwd: password,
          // User management commands can only use w:1 or w:majority
          // https://github.com/mongodb/mongo/blob/4b65e1c663042d6c2e879ab20ba4b3c22439997a/src/mongo/db/global_catalog/sharding_catalog_client_impl.cpp#L1112-L1113
          writeConcern: { w: 'majority', j: true, wtimeout: 0 },
          ...rest,
        });
      }
    });
    await this.updateDefaultConnectionOptions({
      auth: this.users[0],
    });
  }

  async updateDefaultConnectionOptions(
    options: Partial<MongoClientOptions>,
  ): Promise<void> {
    await safePromiseAll(
      [...this.children()].map(async (child) =>
        child.updateDefaultConnectionOptions(options),
      ),
    );
    this.defaultConnectionOptions = {
      ...this.defaultConnectionOptions,
      ...options,
    };
  }

  async close(): Promise<void> {
    await safePromiseAll(
      [...this.children(), this.oidcMockProviderProcess].map((closable) =>
        closable?.close(),
      ),
    );
    await this.dockerComposeProject?.close();
    this.servers = [];
    this.shards = [];
  }

  async withClient<Fn extends (client: MongoClient) => any>(
    fn: Fn,
    clientOptions: MongoClientOptions = {},
  ): Promise<ReturnType<Fn>> {
    const client = await MongoClient.connect(this.connectionString, {
      ...this.getFullWriteConcernOptions(),
      ...this.defaultConnectionOptions,
      ...clientOptions,
    });
    try {
      return await fn(client);
    } finally {
      await client.close(true);
    }
  }

  ref(): void {
    for (const child of this.children()) child.ref();
  }

  unref(): void {
    for (const child of this.children()) child.unref();
  }

  // Return maximal write concern options based on topology
  getFullWriteConcernOptions(): { writeConcern?: WriteConcernSettings } {
    switch (this.topology) {
      case 'standalone':
        return {};
      case 'replset':
        return {
          writeConcern: {
            w: this.servers.filter((s) => !s.isArbiter).length,
            j: true,
          },
        };
      case 'sharded':
        return {
          writeConcern: {
            w: Math.min(
              ...this.shards
                .map((s) => s.getFullWriteConcernOptions().writeConcern?.w)
                .filter((w) => typeof w === 'number'),
            ),
            j: true,
          },
        };
      default:
        throw new Error(
          `Not implemented for topology ${this.topology as string}`,
        );
    }
  }
}
