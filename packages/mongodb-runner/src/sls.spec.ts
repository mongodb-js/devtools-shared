import { expect } from 'chai';
import path from 'path';
import { readPinnedSlsCommit } from './sls';

const FIXTURES = path.resolve(__dirname, '..', 'test', 'fixtures', 'sls');

describe('readPinnedSlsCommit', function () {
  it('reads pinned_sls_commit from a manifest', async function () {
    expect(
      await readPinnedSlsCommit(path.join(FIXTURES, 'complete')),
      'should return the pinned commit verbatim',
    ).to.equal('abc123def456');
  });

  it('names the path it looked at when the manifest is absent', async function () {
    const missing = path.join(FIXTURES, 'does-not-exist');
    const err = await readPinnedSlsCommit(missing).catch((e: Error) => e);
    expect(
      (err as Error).message,
      'error should name the manifest path that was checked',
    ).to.include(path.join(missing, 'manifest.json'));
    expect(
      (err as Error).message,
      'error should mention the override flag',
    ).to.include('--slsImageTag');
  });

  it('reports a manifest that is missing the key', async function () {
    const err = await readPinnedSlsCommit(path.join(FIXTURES, 'no-key')).catch(
      (e: Error) => e,
    );
    expect(
      (err as Error).message,
      'error should name the missing key',
    ).to.include('pinned_sls_commit');
  });

  it('reports a malformed manifest', async function () {
    const err = await readPinnedSlsCommit(
      path.join(FIXTURES, 'malformed'),
    ).catch((e: Error) => e);
    expect(
      (err as Error).message,
      'error should say the manifest could not be parsed',
    ).to.match(/parse/i);
  });
});
