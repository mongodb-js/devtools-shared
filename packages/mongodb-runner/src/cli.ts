import yargs from 'yargs';
import { MongoCluster } from './mongocluster';
import os from 'os';

(async function () {
  // TODO(MONGOSH-1488): Proper CLI with start/stop/exec
  const argv = await yargs
    .version(false)
    .option('topology', {
      alias: 't',
      choices: ['standalone', 'replset', 'sharded'] as const,
      default: 'standalone' as const,
    })
    .option('arbiters', {
      type: 'number',
    })
    .option('secondaries', { type: 'number' })
    .option('shards', { type: 'number' })
    .option('version', { type: 'string' })
    .option('logDir', { type: 'string' })
    .option('binDir', { type: 'string' })
    .option('tmpDir', { type: 'string', default: os.tmpdir() })
    .option('docker', { type: 'string' })
    .help().argv;
  await MongoCluster.start({
    ...argv,
    args: argv._.map(String),
  });
})().catch((err) => {
  process.nextTick(() => {
    throw err;
  });
});
