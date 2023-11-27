import type { MongoServerOptions } from './mongoserver';
import { MongoServer } from './mongoserver';
import { ConnectionString } from 'mongodb-connection-string-url';
import type { DownloadOptions } from '@mongodb-js/mongodb-downloader';
import { downloadMongoDb } from '@mongodb-js/mongodb-downloader';
import type { MongoClientOptions } from 'mongodb';
import { MongoClient } from 'mongodb';
import { sleep, range, uuid, debug } from './util';

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
  downloadOptions?: DownloadOptions;
}

export class MongoCluster {
  private topology: MongoClusterOptions['topology'] = 'standalone';
  private replSetName?: string;
  private servers: MongoServer[] = []; // mongod/mongos
  private shards: MongoCluster[] = []; // replsets

  private constructor() {
    /* see .start() */
  }

  serialize(): unknown /* JSON-serializable */ {
    return {
      topology: this.topology,
      replSetName: this.replSetName,
      servers: this.servers.map((srv) => srv.serialize()),
      shards: this.shards.map((shard) => shard.serialize()),
    };
  }

  isClosed(): boolean {
    return this.servers.length === 0 && this.shards.length === 0;
  }

  static async deserialize(serialized: any): Promise<MongoCluster> {
    const cluster = new MongoCluster();
    cluster.topology = serialized.topology;
    cluster.replSetName = serialized.replSetName;
    cluster.servers = await Promise.all(
      serialized.servers.map((srv: any) => MongoServer.deserialize(srv))
    );
    cluster.shards = await Promise.all(
      serialized.shards.map((shard: any) => MongoCluster.deserialize(shard))
    );
    return cluster;
  }

  get hostport(): string {
    return this.servers.map((srv) => srv.hostport).join(',');
  }

  get connectionString(): string {
    return `mongodb://${this.hostport}/${
      this.replSetName ? `?replicaSet=${this.replSetName}` : ''
    }`;
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
    if (!options.binDir) {
      options.binDir = await downloadMongoDb(
        options.tmpDir,
        options.version,
        options.downloadOptions
      );
    }

    if (options.topology === 'standalone') {
      cluster.servers.push(
        await MongoServer.start({
          ...options,
          binary: 'mongod',
        })
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
          range(secondaries + arbiters).map(() =>
            MongoServer.start({
              ...options,
              args,
              binary: 'mongod',
            })
          )
        ))
      );

      await primary.withClient(async (client) => {
        debug('Running rs.initiate');
        const rsConf = {
          _id: replSetName,
          configsvr: args.includes('--configsvr'),
          members: cluster.servers.map((srv, i) => {
            return {
              _id: i,
              host: srv.hostport,
              arbiterOnly: i > 1 + secondaries,
              priority: i === 0 ? 1 : 0,
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
            debug('rs.status indicated primary for replset', status.set);
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

      debug('starting config server and shard servers', shardArgs);
      const [configsvr, ...shardsvrs] = await Promise.all(
        range(shards + 1).map((i) =>
          MongoCluster.start({
            ...options,
            args: [...shardArgs, i > 0 ? '--shardsvr' : '--configsvr'],
            topology: 'replset',
          })
        )
      );
      cluster.shards.push(configsvr, ...shardsvrs);

      debug('starting mongos');
      const mongos = await MongoServer.start({
        ...options,
        binary: 'mongos',
        args: [
          ...(options.args ?? []),
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
    return cluster;
  }

  async close(): Promise<void> {
    await Promise.all(
      [...this.servers, ...this.shards].map((closable) => closable.close())
    );
    this.servers = [];
    this.shards = [];
  }

  async withClient<Fn extends (client: MongoClient) => any>(
    fn: Fn,
    clientOptions: MongoClientOptions = {}
  ): Promise<ReturnType<Fn>> {
    const client = await MongoClient.connect(
      this.connectionString,
      clientOptions
    );
    try {
      return await fn(client);
    } finally {
      await client.close(true);
    }
  }

  ref(): void {
    for (const child of [...this.servers, ...this.shards]) child.ref();
  }

  unref(): void {
    for (const child of [...this.servers, ...this.shards]) child.unref();
  }
}
