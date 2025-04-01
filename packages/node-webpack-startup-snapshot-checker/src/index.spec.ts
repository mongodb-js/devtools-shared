import { spawn } from 'cross-spawn';
import path from 'path';
import { expect } from 'chai';

describe('startup snapshot checker', function () {
  const execFile = (
    command: string,
    args: ReadonlyArray<string>
  ): Promise<void> => {
    const proc = spawn(command, args);
    return new Promise<void>((resolve, reject) => {
      proc.stderr.setEncoding('utf8');
      let errBuffer = '';
      proc.stderr.on('data', (data) => {
        errBuffer += data;
      });

      proc.once('exit', (code, signal) => {
        let err: Error;
        if (signal) {
          err = new Error(`Failed with signal ${signal}`);
        } else if (code !== null && code !== 0) {
          err = new Error(`Failed with code ${code}`);
        } else {
          return resolve();
        }

        err.message += '\n' + errBuffer;
        reject(err);
      });
    });
  };

  it('can detect when a package is simple enough to be snapshotted', async function () {
    await execFile('npx', [
      'ts-node',
      path.resolve(__dirname, 'index.ts'),
      path.resolve(__dirname, '..', 'test', 'fixtures', 'snapshottable.js'),
    ]);
  });

  it('can detect when a package is too complex to be snapshotted', async function () {
    try {
      await execFile('npx', [
        'ts-node',
        path.resolve(__dirname, 'index.ts'),
        path.resolve(__dirname, '..', 'test', 'fixtures', 'unsnapshottable.js'),
      ]);

      expect.fail('missed exception');
    } catch (err) {
      expect(err).to.match(/Command failed/);
    }
  });
});
