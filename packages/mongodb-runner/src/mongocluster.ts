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
} from './util';
import { OIDCMockProviderProcess } from './oidc';
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

export type MongoClusterOptions = Pick<
  MongoServerOptions,
  'logDir' | 'tmpDir' | 'args' | 'binDir' | 'docker' | 'internalClientOptions'
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
    args.splice(portArgIndex + 1, 1);
  } else if (
    (portArgIndex = args.findIndex((arg) => arg.startsWith('--port='))) !== -1
  ) {
    args.splice(portArgIndex, 1);
  }
  return args;
}

function hasPortArg(args: string[] | undefined): boolean {
  if (!args) return false;
  return (
    args.includes('--port') || args.some((arg) => arg.startsWith('--port='))
  );
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
  ): Promise<string> {
    return downloadMongoDb({
      directory: tmpdir,
      version: targetVersionSemverSpecifier,
      downloadOptions: options,
      useLockfile: true,
    });
  }

  serialize(): unknown /* JSON-serializable */ {
    return {
      topology: this.topology,
      replSetName: this.replSetName,
      servers: this.servers.map((srv) => srv.serialize()),
      shards: this.shards.map((shard) => shard.serialize()),
      oidcMockProviderProcess: this.oidcMockProviderProcess?.serialize(),
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
    cluster.servers = await Promise.all(
      serialized.servers.map((srv: any) => MongoServer.deserialize(srv)),
    );
    cluster.shards = await Promise.all(
      serialized.shards.map((shard: any) => MongoCluster.deserialize(shard)),
    );
    cluster.oidcMockProviderProcess = serialized.oidcMockProviderProcess
      ? OIDCMockProviderProcess.deserialize(serialized.oidcMockProviderProcess)
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

  static async start({
    ...options
  }: MongoClusterOptions): Promise<MongoCluster> {
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

    if (options.topology === 'standalone') {
      cluster.servers.push(
        await MongoServer.start({
          ...options,
          binary: 'mongod',
        }),
      );
    } else if (options.topology === 'replset') {
      const { rsMembers, replSetName } = processRSMembers(options);

      debug('Starting replica set nodes', {
        replSetName,
        secondaries: rsMembers.filter((m) => !m.arbiterOnly).length - 1,
        arbiters: rsMembers.filter((m) => m.arbiterOnly).length,
      });
      const primaryIndex = rsMembers.findIndex((m) =>
        rsMembers.every((m2) => m.priority ?? 0 >= (m2.priority ?? 0)),
      );
      assert.notStrictEqual(primaryIndex, -1);

      const nodes = await Promise.all(
        rsMembers.map(async (member) => {
          return [
            await MongoServer.start({
              ...options,
              args: member.args,
              binary: 'mongod',
            }),
            member,
          ] as const;
        }),
      );
      cluster.servers.push(...nodes.map(([srv]) => srv));
      const primary = cluster.servers[primaryIndex];

      await primary.withClient(async (client) => {
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
      const allShards = await Promise.all(
        shards.map(async (s) => {
          const isConfig = s.args?.includes('--configsvr');
          const cluster = await MongoCluster.start({
            ...options,
            ...s,
            topology: 'replset',
            requireApiVersion: undefined,
            users: isConfig ? undefined : options.users, // users go on the mongos/config server only for the config set
          });
          return [cluster, isConfig] as const;
        }),
      );
      const configsvr = allShards.find(([, isConfig]) => isConfig)![0];
      const shardsvrs = allShards
        .filter(([, isConfig]) => !isConfig)
        .map(([shard]) => shard);
      cluster.shards.push(configsvr, ...shardsvrs);

      const mongosServers: MongoServer[] = await Promise.all(
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
    return cluster;
  }

  private *children(): Iterable<MongoServer | MongoCluster> {
    yield* this.servers;
    yield* this.shards;
  }

  async addRequireApiVersionIfNeeded({
    ...options
  }: MongoClusterOptions): Promise<void> {
    // Set up requireApiVersion if requested.
    if (options.requireApiVersion !== undefined) {
      return;
    }
    if (options.topology === 'replset') {
      throw new Error(
        'requireApiVersion is not supported for replica sets, see SERVER-97010',
      );
    }
    await Promise.all(
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
        await admin.command({ createUser: username, pwd: password, ...rest });
      }
    });
    await this.updateDefaultConnectionOptions({
      auth: this.users[0],
    });
  }

  async updateDefaultConnectionOptions(
    options: Partial<MongoClientOptions>,
  ): Promise<void> {
    await Promise.all(
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
    await Promise.all(
      [...this.children(), this.oidcMockProviderProcess].map((closable) =>
        closable?.close(),
      ),
    );
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
        return { writeConcern: { w: this.servers.length, j: true } };
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
