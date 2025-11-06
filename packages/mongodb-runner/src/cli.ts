/* eslint-disable no-console */
import yargs from 'yargs';
import os from 'os';
import path from 'path';
import createDebug from 'debug';
import * as utilities from './index';
import { ConnectionString } from 'mongodb-connection-string-url';
import { MongoClientOptions } from 'mongodb';

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
    .option('downloadDir', {
      type: 'string',
      describe:
        'Directory for downloading and caching MongoDB binaries (uses tmpDir if not specified)',
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
    .option('oidc', {
      type: 'string',
      describe: 'Configure OIDC authentication on the server',
    })
    .option('debug', { type: 'boolean', describe: 'Enable debug output' })
    .command('start', 'Start a MongoDB instance')
    .command('stop', 'Stop a MongoDB instance')
    .command('prune', 'Clean up metadata for any dead MongoDB instances')
    .command('ls', 'List currently running MongoDB instances')
    .command(
      'exec',
      'Run a process with a MongoDB instance (as MONGODB_URI env var)',
    )
    .demandCommand(1, 'A command needs to be provided')
    .help().argv;
  const [command, ...args] = argv._.map(String);
  if (argv.debug) {
    createDebug.enable('mongodb-runner');
  }

  if (argv.oidc && process.platform !== 'linux') {
    console.warn(
      'OIDC authentication is currently only supported on Linux platforms.',
    );
  }
  if (argv.oidc && !argv.version?.includes('enterprise')) {
    console.warn(
      'OIDC authentication is currently only supported on Enterprise server versions.',
    );
  }

  async function start() {
    const { cluster, id } = await utilities.start(argv, args);
    const cs = new ConnectionString(cluster.connectionString);
    console.log(`Server started and running at ${cs.toString()}`);
    if (cluster.oidcIssuer) {
      cs.typedSearchParams<MongoClientOptions>().set(
        'authMechanism',
        'MONGODB-OIDC',
      );
      console.log(`OIDC provider started and running at ${cluster.oidcIssuer}`);
      console.log(`Server connection string with OIDC auth: ${cs.toString()}`);
    }
    console.log('Run the following command to stop the instance:');
    console.log(
      `${argv.$0} stop --id=${id}` +
        (argv.runnerDir !== defaultRunnerDir
          ? `--runnerDir=${argv.runnerDir}`
          : ''),
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
    await utilities.exec(argv, args);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async function unknown() {
    throw new Error(
      `Unknown command: ${command}. See '${argv.$0} --help' for more information.`,
    );
  }

  await ({ start, stop, exec, ls, prune }[command] ?? unknown)();
})().catch((err) => {
  process.nextTick(() => {
    throw err;
  });
});
