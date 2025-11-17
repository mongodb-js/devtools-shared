import type { MongoServerEvents, MongoServerOptions } from './mongoserver';
import { MongoServer } from './mongoserver';
import { ConnectionString } from 'mongodb-connection-string-url';
import type { DownloadOptions } from '@mongodb-js/mongodb-downloader';
import { downloadMongoDb } from '@mongodb-js/mongodb-downloader';
import type { Document, MongoClientOptions, TagSet } from 'mongodb';
import { MongoClient } from 'mongodb';
import { sleep, range, uuid, debug, jsonClone } from './util';
import { OIDCMockProviderProcess } from './oidc';
import { EventEmitter } from 'events';

export interface MongoDBUserDoc {
  username: string;
  password: string;
  customData?: Document;
  roles: ({ role: string; db?: string } | string)[];
}

export interface RSMemberOptions {
  tags?: TagSet;
  priority?: number;
  args?: string[];
}
export interface MongoClusterOptions
  extends Pick<
    MongoServerOptions,
    'logDir' | 'tmpDir' | 'args' | 'binDir' | 'docker'
  > {
  topology: 'standalone' | 'replset' | 'sharded';
  arbiters?: number;
  secondaries?: number;
  shards?: number;
  version?: string;
  downloadDir?: string;
  downloadOptions?: DownloadOptions;
  oidc?: string;
  rsMemberOptions?: RSMemberOptions[];
  shardArgs?: string[][];
  mongosArgs?: string[][];
  users?: MongoDBUserDoc[];
}

export type MongoClusterEvents = {
  [k in keyof MongoServerEvents]: [serverUUID: string, ...MongoServerEvents[k]];
} & {
  newListener: [keyof MongoClusterEvents];
  removeListener: [keyof MongoClusterEvents];
};

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
    const cs = new ConnectionString(`mongodb://${this.hostport}/`);
    if (this.replSetName)
      cs.typedSearchParams<MongoClientOptions>().set(
        'replicaSet',
        this.replSetName,
      );
    return cs.toString();
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
    const cluster = new MongoCluster();
    cluster.topology = options.topology;
    cluster.users = options.users ?? [];
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
      const { secondaries = 2, arbiters = 0 } = options;

      const args = [...(options.args ?? [])];
      let replSetName: string;
      if (!args.includes('--replSet')) {
        replSetName = `replSet-${uuid()}`;
        args.push('--replSet', replSetName);
      } else {
        replSetName = args[args.indexOf('--replSet') + 1];
      }

      const primaryArgs = [...args];
      const rsMemberOptions = options.rsMemberOptions || [{}];
      if (rsMemberOptions.length > 0) {
        primaryArgs.push(...(rsMemberOptions[0].args || []));
      }
      debug('Starting primary', primaryArgs);
      const primary = await MongoServer.start({
        ...options,
        args: primaryArgs,
        binary: 'mongod',
      });
      cluster.servers.push(primary);

      if (args.includes('--port')) {
        args.splice(args.indexOf('--port') + 1, 1, '0');
      }

      debug('Starting secondaries and arbiters', {
        secondaries,
        arbiters,
        args,
      });
      cluster.servers.push(
        ...(await Promise.all(
          range(secondaries + arbiters).map((i) => {
            const secondaryArgs = [...args];
            if (i + 1 < rsMemberOptions.length) {
              secondaryArgs.push(...(rsMemberOptions[i + 1].args || []));
              debug('Adding secondary args', rsMemberOptions[i + 1].args || []);
            }
            return MongoServer.start({
              ...options,
              args: secondaryArgs,
              binary: 'mongod',
            });
          }),
        )),
      );

      await primary.withClient(async (client) => {
        debug('Running rs.initiate');
        const rsConf = {
          _id: replSetName,
          configsvr: args.includes('--configsvr'),
          members: cluster.servers.map((srv, i) => {
            let options: RSMemberOptions = {};
            if (i < rsMemberOptions.length) {
              options = rsMemberOptions[i];
            }
            let priority = i === 0 ? 1 : 0;
            if (options.priority !== undefined) {
              priority = options.priority;
            }
            return {
              _id: i,
              host: srv.hostport,
              arbiterOnly: i > secondaries,
              priority,
              tags: options.tags || {},
            };
          }),
        };
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
      const { shards = 3 } = options;
      const shardArgs = [...(options.args ?? [])];
      if (shardArgs.includes('--port')) {
        shardArgs.splice(shardArgs.indexOf('--port') + 1, 1, '0');
      }
      const perShardArgs = options.shardArgs || [[]];

      debug('starting config server and shard servers', shardArgs);
      const [configsvr, ...shardsvrs] = await Promise.all(
        range(shards + 1).map((i) => {
          const args: string[] = [...shardArgs];
          if (i === 0) {
            args.push('--configsvr');
          } else {
            if (i - 1 < perShardArgs.length) {
              args.push(...perShardArgs[i - 1]);
              debug('Adding shard args', perShardArgs[i - 1]);
            }
            if (!args.includes('--shardsvr')) {
              args.push('--shardsvr');
            }
          }
          return MongoCluster.start({
            ...options,
            args,
            topology: 'replset',
          });
        }),
      );
      cluster.shards.push(configsvr, ...shardsvrs);

      const mongosArgs = options.mongosArgs ?? [[]];
      for (let i = 0; i < mongosArgs.length; i++) {
        debug('starting mongos');
        const mongos = await MongoServer.start({
          ...options,
          binary: 'mongos',
          args: [
            ...(options.args ?? []),
            ...mongosArgs[i],
            '--configdb',
            `${configsvr.replSetName!}/${configsvr.hostport}`,
          ],
        });
        cluster.servers.push(mongos);
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
    }

    await cluster.addAuthIfNeeded();
    return cluster;
  }

  *children(): Iterable<MongoServer | MongoCluster> {
    yield* this.servers;
    yield* this.shards;
  }

  async addAuthIfNeeded(): Promise<void> {
    if (!this.users?.length) return;
    // Sleep to give time for a possible replset election to settle.
    await sleep(1000);
    await this.withClient(async (client) => {
      const admin = client.db('admin');
      for (const user of this.users) {
        const { username, password, ...rest } = user;
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
}
