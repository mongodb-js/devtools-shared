/* eslint-disable no-console */
import yargs from 'yargs';
import { MongoCluster } from './mongocluster';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import createDebug from 'debug';
import { once } from 'events';
import * as utilities from './index';

(async function () {
  const defaultRunnerDir = path.join(os.homedir(), '.mongodb', 'runner2');
  const argv = await yargs
    .version(false)
    .scriptName('mongodb-runner')
    .env('MONGODB_RUNNER')
    .option('topology', {
      alias: 't',
      choices: ['standalone', 'replset', 'sharded'] as const,
      default: 'standalone' as const,
      describe: 'Select a topology type',
    })
    .option('arbiters', {
      type: 'number',
      describe: 'number of arbiter nodes for each replica set',
    })
    .option('secondaries', {
      type: 'number',
      describe: 'number of secondaries for each replica set',
    })
    .option('shards', {
      type: 'number',
      describe: 'number of shards for sharded clusters',
    })
    .option('version', {
      type: 'string',
      describe: 'MongoDB server version to use',
    })
    .option('logDir', {
      type: 'string',
      describe: 'Directory to store server log files in',
    })
    .option('binDir', {
      type: 'string',
      describe: 'Directory containing mongod/mongos binaries',
    })
    .option('tmpDir', {
      type: 'string',
      default: os.tmpdir(),
      describe: 'Directory for temporary files',
    })
    .option('runnerDir', {
      type: 'string',
      default: defaultRunnerDir,
      describe: 'Directory for storing cluster metadata',
    })
    .option('docker', {
      type: 'string',
      describe: 'Docker image name to run server instances under',
    })
    .option('id', {
      type: 'string',
      describe: 'ID to save the cluster metadata under',
    })
    .option('all', {
      type: 'boolean',
      describe: 'for `stop`: stop all clusters',
    })
    .option('debug', { type: 'boolean', describe: 'Enable debug output' })
    .command('start', 'Start a MongoDB instance')
    .command('stop', 'Stop a MongoDB instance')
    .command('prune', 'Clean up metadata for any dead MongoDB instances')
    .command('ls', 'List currently running MongoDB instances')
    .command(
      'exec',
      'Run a process with a MongoDB instance (as MONGODB_URI env var)'
    )
    .demandCommand(1, 'A command needs to be provided')
    .help().argv;
  const [command, ...args] = argv._.map(String);
  if (argv.debug) {
    createDebug.enable('mongodb-runner');
  }

  async function start() {
    const { cluster, id } = await utilities.start(argv);
    console.log(`Server started and running at ${cluster.connectionString}`);
    console.log('Run the following command to stop the instance:');
    console.log(
      `${argv.$0} stop --id=${id}` +
        (argv.runnerDir !== defaultRunnerDir
          ? `--runnerDir=${argv.runnerDir}`
          : '')
    );
    cluster.unref();
  }

  async function stop() {
    if (!argv.id && !argv.all) {
      throw new Error('Need --id or --all to know which server to stop');
    }
    await utilities.stop(argv);
  }

  async function ls() {
    for await (const { id, connectionString } of utilities.instances(argv)) {
      console.log(`${id}: ${connectionString}`);
    }
  }

  async function prune() {
    await utilities.prune(argv);
  }

  async function exec() {
    let mongodArgs: string[];
    let execArgs: string[];

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

  // eslint-disable-next-line @typescript-eslint/require-await
  async function unknown() {
    throw new Error(
      `Unknown command: ${command}. See '${argv.$0} --help' for more information.`
    );
  }

  await ({ start, stop, exec, ls, prune }[command] ?? unknown)();
})().catch((err) => {
  process.nextTick(() => {
    throw err;
  });
});
