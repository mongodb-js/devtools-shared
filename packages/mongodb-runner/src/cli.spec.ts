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

async function runCliExpectingFailure(args: string[]): Promise<string> {
  try {
    await runCli(args);
  } catch (err) {
    return String((err as { stderr?: string }).stderr ?? '');
  }
  throw new Error(`expected the CLI to fail: ${args.join(' ')}`);
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

  it('keeps writing server logs after `start` has exited', async function () {
    const logDir = path.join(tmpDir, 'logs-after-start');
    const runnerDir = path.join(tmpDir, 'runner-logs-after-start');
    const stdout = await runCli([
      'start',
      '--topology',
      'standalone',
      '--runnerDir',
      runnerDir,
      '--logDir',
      logDir,
    ]);
    try {
      const [logFile] = await fs.readdir(logDir);
      const logPath = path.join(logDir, logFile);
      const sizeAtExit = (await fs.stat(logPath)).size;
      expect(sizeAtExit, 'startup output is in the log').to.be.greaterThan(0);

      // Accepting a connection is logged, and the runner is no longer around
      // to pipe it into the file.
      const client = new MongoClient(stdout.trim());
      await client.db('admin').command({ ping: 1 });
      await client.close();

      let sizeNow = sizeAtExit;
      for (let i = 0; i < 50 && sizeNow === sizeAtExit; i++) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        sizeNow = (await fs.stat(logPath)).size;
      }
      expect(sizeNow, 'log grew after start exited').to.be.greaterThan(
        sizeAtExit,
      );
    } finally {
      await runCli(['stop', '--all', '--runnerDir', runnerDir]);
    }
  });

  it('reports a failed server startup when --logDir is set', async function () {
    // The failure is timing-dependent (the process used to exit 0 silently
    // when the server died between log polls), so repeat it.
    for (let i = 0; i < 5; i++) {
      const stderr = await runCliExpectingFailure([
        'start',
        '--topology',
        'standalone',
        '--runnerDir',
        path.join(tmpDir, `runner-failed-start-${i}`),
        '--logDir',
        path.join(tmpDir, `logs-failed-start-${i}`),
        '--',
        '--setParameter',
        'nonexistentParam=1',
      ]);
      expect(stderr, `attempt ${i}`).to.include('Server failed to start');
    }
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

    const parsed = JSON.parse(stdout) as {
      id: string;
      connectionString: string;
    };

    expect(stdout.trim(), 'JSON output should be a single line').to.not.contain(
      '\n',
    );
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
    expect(
      lsStdout.trim(),
      'ls --json output should be a single line',
    ).to.not.contain('\n');
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

  it('emits an empty JSON array for ls --json with no instances', async function () {
    const emptyDir = path.join(tmpDir, 'empty-runner');
    await fs.mkdir(emptyDir, { recursive: true });

    const stdout = await runCli(['ls', '--json', '--runnerDir', emptyDir]);

    expect(JSON.parse(stdout)).to.deep.equal([]);
  });

  it('rejects a --slsDir with no path', async function () {
    const stderr = await runCliExpectingFailure(['start', '--slsDir']);
    expect(stderr, 'the error should say a path is required').to.include(
      '--slsDir requires a path',
    );
  });

  it('rejects a --slsDir that is not an SLS dir', async function () {
    const stderr = await runCliExpectingFailure([
      'start',
      `--slsDir=${path.join(tmpDir, 'not-an-sls-dir')}`,
    ]);
    expect(
      stderr,
      'a directory without the SLS files should be rejected',
    ).to.include('not a disaggregated-storage-capable MongoDB build');
  });
});
