import { BSON } from 'mongodb';
import path from 'path';
import { MongoCluster } from './mongocluster';
import { parallelForEach } from './util';
import * as fs from 'fs/promises';
import { spawn } from 'child_process';
import { once } from 'events';
export async function start(argv, args) {
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
    JSON.stringify({ id, serialized, connectionString }),
  );
  cluster.unref();
  return { cluster, id };
}
export async function* instances(argv) {
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
export async function prune(argv) {
  async function handler(instance) {
    try {
      const cluster = await MongoCluster.deserialize(instance.serialized);
      await cluster.withClient(
        () => {
          // connect and close
        },
        { serverSelectionTimeoutMS: 2000 },
      );
    } catch (e) {
      await fs.rm(instance.filepath);
    }
  }
  await parallelForEach(instances(argv), handler);
}
export async function stop(argv) {
  await parallelForEach(instances(argv), async (instance) => {
    if (instance.id !== argv.id && !argv.all) return;
    await (await MongoCluster.deserialize(instance.serialized)).close();
    await fs.rm(instance.filepath);
  });
}
export async function exec(argv, args) {
  let mongodArgs;
  let execArgs;
  const doubleDashIndex = args.indexOf('--');
  if (doubleDashIndex !== -1) {
    mongodArgs = args.slice(0, doubleDashIndex);
    execArgs = args.slice(doubleDashIndex + 1);
  } else {
    mongodArgs = [];
    execArgs = args;
  }
  const cluster = await MongoCluster.start({
    ...argv,
    args: mongodArgs,
  });
  try {
    const [prog, ...progArgs] = execArgs;
    const child = spawn(prog, progArgs, {
      stdio: 'inherit',
      env: {
        ...process.env,
        // both spellings since otherwise I'd end up misspelling these half of the time
        MONGODB_URI: cluster.connectionString,
        MONGODB_URL: cluster.connectionString,
        MONGODB_HOSTPORT: cluster.hostport,
      },
    });
    [process.exitCode] = await once(child, 'exit');
  } finally {
    await cluster.close();
  }
}
