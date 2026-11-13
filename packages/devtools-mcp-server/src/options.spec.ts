import os from 'os';
import { expect } from 'chai';
import assert from 'assert';
import type { MongoClusterOptions } from '@mongodb-js/mongodb-runner';
import { toRunnerOptions } from './options';

describe('toRunnerOptions', function () {
  it('defaults the temp directory and leaves everything else unset', async function () {
    const { options, args, sls } = await toRunnerOptions({
      topology: 'standalone',
    });

    expect(options.topology).to.equal('standalone');
    expect(options.tmpDir).to.equal(os.tmpdir());
    expect(options.version).to.be.undefined;
    expect(options.users).to.be.undefined;
    expect(args).to.be.undefined;
    expect(sls).to.be.undefined;
  });

  it('passes replica set options through', async function () {
    const rsMembers: NonNullable<MongoClusterOptions['rsMembers']> = [
      { priority: 1 },
      { tags: { nodeType: 'ANALYTICS' }, priority: 0 },
    ];

    const { options } = await toRunnerOptions({
      topology: 'replset',
      secondaries: 1,
      arbiters: 1,
      rsMembers,
      version: '8.2',
    });

    expect(options).to.include({
      topology: 'replset',
      secondaries: 1,
      arbiters: 1,
      version: '8.2',
    });
    expect(options.rsMembers).to.deep.equal(rsMembers);
  });

  it('passes sharded options through', async function () {
    const { options } = await toRunnerOptions({
      topology: 'sharded',
      shards: [{ secondaries: 0 }, { secondaries: 2, args: ['--shardsvr'] }],
      mongosArgs: [[], ['--setParameter', 'enableTestCommands=1']],
    });

    expect(options.shards).to.deep.equal([
      { secondaries: 0 },
      { secondaries: 2, args: ['--shardsvr'] },
    ]);
    expect(options.mongosArgs).to.deep.equal([
      [],
      ['--setParameter', 'enableTestCommands=1'],
    ]);
  });

  it('keeps mongod args out of the cluster options', async function () {
    const args = ['--setParameter', 'enableTestCommands=1'];

    const result = await toRunnerOptions({ topology: 'standalone', args });

    expect(result.args).to.deep.equal(args);
    expect(result.options).to.not.have.property('args');
  });

  it('rejects an empty slsDir', async function () {
    await assert.rejects(
      toRunnerOptions({ topology: 'replset', slsDir: '' }),
      /slsDir must be the path/,
    );
  });

  it('rejects an slsDir without the SLS compose files', async function () {
    await assert.rejects(
      toRunnerOptions({ topology: 'replset', slsDir: '/nonexistent/sls' }),
      /not a disaggregated-storage-capable MongoDB build/,
    );
  });
});
