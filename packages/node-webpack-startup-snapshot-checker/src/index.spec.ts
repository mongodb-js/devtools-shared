/* eslint-disable no-console */
import { execFile as execFileCallback } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { expect } from 'chai';
const execFile = promisify(execFileCallback);

describe('startup snapshot checker', function () {
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
