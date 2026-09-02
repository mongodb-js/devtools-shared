import { expect } from 'chai';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import { execFile } from 'child_process';
import type { ExecOptions } from 'child_process';
import { MongoClient } from 'mongodb';

const execFileAsync = promisify(execFile);

async function runCli(
  args: string[],
  options: ExecOptions = {},
): Promise<string> {
  const { stdout } = await execFileAsync(
    process.execPath,
    [path.resolve(__dirname, '..', 'bin', 'runner.js'), ...args],
    options,
  );
  return stdout;
}

describe('cli', function () {
  this.timeout(process.platform === 'win32' ? 400_000 : 100_000);
  let tmpDir = '';

  before(async function () {
    tmpDir = path.join(os.tmpdir(), `runner-cli-tests-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });
  });

  after(async function () {
    await fs.rm(tmpDir, {
      force: true,
      recursive: true,
      maxRetries: 100,
    });
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

  it('emits structured output for start with --json', async function () {
    const stdout = await runCli([
      'start',
      '--topology',
      'standalone',
      '--json',
    ]);

    let parsed: any;
    expect(() => {
      parsed = JSON.parse(stdout);
    }, 'stdout must be parseable as JSON, with diagnostics on stderr').to.not.throw();

    expect(parsed.id, 'result should carry the cluster id').to.be.a('string');
    expect(
      parsed.connectionString,
      'result should carry the connection string',
    ).to.match(/^mongodb:\/\//);

    const client = new MongoClient(parsed.connectionString);
    const result = await client.db('admin').command({ ping: 1 });
    await client.close();
    expect(result.ok, 'reported connection string should be usable').to.eq(1);

    await runCli(['stop', '--all']);
    await runCli(['prune']);
  });

  it('emits structured output for ls with --json', async function () {
    const startStdout = await runCli([
      'start',
      '--topology',
      'standalone',
      '--json',
    ]);
    const started = JSON.parse(startStdout);

    const lsStdout = await runCli(['ls', '--json']);
    let parsed: any;
    expect(() => {
      parsed = JSON.parse(lsStdout);
    }, 'ls --json stdout must be parseable as JSON').to.not.throw();

    expect(parsed, 'ls --json should yield an array').to.be.an('array');
    const entry = parsed.find((e: any) => e.id === started.id);
    expect(entry, 'the started cluster should be listed').to.not.equal(
      undefined,
    );
    expect(
      entry.connectionString,
      'listed connection string should match the one start reported',
    ).to.equal(started.connectionString);

    await runCli(['stop', '--all']);
    await runCli(['prune']);
  });
});
