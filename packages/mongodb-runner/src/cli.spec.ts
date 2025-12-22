import { expect } from 'chai';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import { execFile } from 'child_process';
import type { ExecOptions } from 'child_process';
import createDebug from 'debug';
import sinon from 'sinon';
import { MongoClient } from 'mongodb';

if (process.env.CI) {
  createDebug.enable('mongodb-runner,mongodb-downloader');
}

const execFileAsync = promisify(execFile);

async function runCli(
  args: string[],
  options: ExecOptions = {},
): Promise<string> {
  const fullArgs = ['mongodb-runner', ...args];
  const { stdout } = await execFileAsync('npx', fullArgs, options);
  return stdout;
}

describe('cli', function () {
  this.timeout(100_000);
  let tmpDir = '';

  before(async function () {
    if (process.platform === 'win32') {
      // XXX: Skipping the CLI tests on Windows due to differences in spawn arguments.
      return this.skip();
    }
    tmpDir = path.join(os.tmpdir(), `runner-cli-tests-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });
  });

  after(async function () {
    if (process.platform === 'win32') {
      // XXX: Skipping the CLI tests on Windows due to differences in spawn arguments.
      return;
    }
    await fs.rm(tmpDir, {
      recursive: true,
      maxRetries: 100,
    });
  });

  afterEach(function () {
    sinon.restore();
  });

  it('can manage a standalone cluster with command line args', async function () {
    // Start the CLI with arguments and capture stdout.
    const stdout = await runCli(['start', '--topology', 'standalone']);

    // stdout is JUST the connection string.
    const connectionString = stdout.trim();
    expect(connectionString).to.match(/^mongodb:\/\//);

    // Connect to the cluster.
    const client = new MongoClient(connectionString);
    const result = await client.db('admin').command({ ping: 1 });
    await client.close();
    expect(result.ok).to.eq(1);

    // Exercise the rest of the cli.
    const lsStdout = await runCli(['ls']);
    expect(lsStdout.includes(connectionString)).to.be.true;

    await runCli(['stop', '--all']);

    await runCli(['prune']);
  });
  it('can execute against a cluster', async function () {
    const stdout = await runCli([
      'exec',
      '-t',
      'standalone',
      '--',
      'sh',
      '-c',
      'echo $MONGODB_URI',
    ]);
    const connectionString = stdout.trim();
    expect(connectionString).to.match(/^mongodb:\/\//);
  });
  it('can manage a replset cluster with command line args', async function () {
    const stdout = await runCli([
      'start',
      '--topology',
      'replset',
      '--secondaries',
      '2',
      '--arbiters',
      '1',
      '--version',
      '8.0.x',
      '--',
      '--replSet',
      'repl0',
    ]);
    const connectionString = stdout.trim();
    expect(/repl0/.test(connectionString)).to.be.true;

    const client = new MongoClient(connectionString);
    const result = await client.db('admin').command({ ping: 1 });
    await client.close();
    expect(result.ok).to.eq(1);

    await runCli(['stop', '--all']);
  });
  it('can manage a sharded cluster with command line args', async function () {
    const stdout = await runCli([
      'start',
      '--topology',
      'sharded',
      '--shards',
      '2',
      '--version',
      '7.0.x',
    ]);
    const connectionString = stdout.trim();

    const client = new MongoClient(connectionString);
    const result = await client.db('admin').command({ ping: 1 });
    await client.close();
    expect(result.ok).to.eq(1);

    await runCli(['stop', '--all']);
  });
  it('can manage a cluster with a config file', async function () {
    const configFile = path.resolve(
      __dirname,
      '..',
      'test',
      'fixtures',
      'config.json',
    );
    const stdout = await runCli(['start', '--config', configFile]);
    const connectionString = stdout.trim();
    expect(/repl0/.test(connectionString)).to.be.true;

    const client = new MongoClient(connectionString);
    const result = await client.db('admin').command({ ping: 1 });
    await client.close();
    expect(result.ok).to.eq(1);

    await runCli(['stop', '--all']);
  });
});
