import { expect } from 'chai';
import path from 'path';
import { readPinnedSlsCommit, resolveSLSBundle } from './sls';

const FIXTURES = path.resolve(__dirname, '..', 'test', 'fixtures', 'sls');

describe('sls', function () {
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
      const err = await readPinnedSlsCommit(
        path.join(FIXTURES, 'no-key'),
      ).catch((e: Error) => e);
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

  describe('resolveSLSBundle', function () {
    it('resolves a bundle addressed by install root', async function () {
      const root = path.join(FIXTURES, 'bundle-complete');
      const bundle = await resolveSLSBundle(root);
      expect(
        bundle.composeFile,
        'compose file should be found under buildscripts/modules/atlas',
      ).to.equal(
        path.join(
          root,
          'buildscripts',
          'modules',
          'atlas',
          'sls-multicell-docker-compose.yml',
        ),
      );
      expect(
        bundle.manifestFile,
        'manifest should sit next to the compose file',
      ).to.equal(path.join(bundle.atlasDir, 'manifest.json'));
    });

    it('resolves a bundle addressed by its atlas directory', async function () {
      const atlasDir = path.join(
        FIXTURES,
        'bundle-complete',
        'buildscripts',
        'modules',
        'atlas',
      );
      const bundle = await resolveSLSBundle(atlasDir);
      expect(
        bundle.atlasDir,
        'passing the atlas dir directly should also work',
      ).to.equal(atlasDir);
    });

    it('lists every missing file, not just the first', async function () {
      const err = await resolveSLSBundle(
        path.join(FIXTURES, 'bundle-incomplete'),
      ).catch((e: Error) => e);
      const message = (err as Error).message;
      expect(
        message,
        'error should say this is not a disagg-capable build',
      ).to.include('not a disaggregated-storage-capable MongoDB build');
      expect(message, 'should report the missing proto').to.include(
        'slsbackup.proto',
      );
      expect(message, 'should report the missing flags state too').to.include(
        'flags-state.json',
      );
    });

    it('rejects a directory that is not a MongoDB build', async function () {
      const err = await resolveSLSBundle(
        path.join(FIXTURES, 'not-a-build'),
      ).catch((e: Error) => e);
      expect(
        (err as Error).message,
        'a non-build directory should be rejected clearly',
      ).to.include('not a disaggregated-storage-capable MongoDB build');
    });
  });
});
