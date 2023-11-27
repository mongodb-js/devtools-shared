import { BSON } from 'mongodb';
import path from 'path';
import type { MongoClusterOptions } from './mongocluster';
import { MongoCluster } from './mongocluster';
import { parallelForEach } from './util';
import * as fs from 'fs/promises';

interface StoredInstance {
  id: string;
  filepath: string;
  serialized: string;
  connectionString: string;
}

export async function start(
  argv: {
    id?: string;
    runnerDir: string;
  } & MongoClusterOptions,
  args?: string[]
) {
  const id = argv.id || new BSON.UUID().toHexString();
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error(`ID '${id}' contains non-alphanumeric characters`);
  }
  await fs.mkdir(argv.runnerDir, { recursive: true });

  const cluster = await MongoCluster.start({
    ...argv,
    args,
  });
  const serialized = await cluster.serialize();
  const { connectionString } = cluster;

  await fs.writeFile(
    path.join(argv.runnerDir, `m-${id}.json`),
    JSON.stringify({ id, serialized, connectionString })
  );

  cluster.unref();

  return { cluster, id };
}

export async function* instances(argv: {
  runnerDir: string;
}): AsyncIterable<StoredInstance> {
  for await (const { name } of await fs.opendir(argv.runnerDir)) {
    if (name.startsWith('m-') && name.endsWith('.json')) {
      try {
        const filepath = path.join(argv.runnerDir, name);
        const stored = JSON.parse(await fs.readFile(filepath, 'utf8'));
        yield { ...stored, filepath };
      } catch {
        /* ignore */
      }
    }
  }
}

/**
 * Attempts to connect to every mongodb instance defined in `runnerDir`.
 * If it cannot connect to an instance, it cleans up the entry from `runnerDir`.
 */
export async function prune(argv: { runnerDir: string }): Promise<void> {
  async function handler(instance: StoredInstance) {
    try {
      const cluster = await MongoCluster.deserialize(instance.serialized);
      await cluster.withClient(
        () => {
          // connect and close
        },
        { serverSelectionTimeoutMS: 2000 }
      );
    } catch (e) {
      await fs.rm(instance.filepath);
    }
  }
  await parallelForEach(instances(argv), handler);
}

export async function stop(argv: {
  runnerDir: string;
  id?: string;
  all?: boolean;
}) {
  const toStop: Array<StoredInstance> = [];
  for await (const instance of instances(argv)) {
    if (instance.id === argv.id || argv.all) toStop.push(instance);
  }
  await Promise.all(
    toStop.map(async ({ filepath, serialized }) => {
      await (await MongoCluster.deserialize(serialized)).close();
      await fs.rm(filepath);
    })
  );
}
