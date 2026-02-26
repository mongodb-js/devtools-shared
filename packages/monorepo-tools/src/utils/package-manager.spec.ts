import assert from 'assert';
import * as packageManager from './package-manager';

describe('package-manager', function () {
  let originalEnv: string | undefined;

  beforeEach(function () {
    originalEnv = process.env.USE_PNPM;
  });

  afterEach(function () {
    if (originalEnv === undefined) {
      delete process.env.USE_PNPM;
    } else {
      process.env.USE_PNPM = originalEnv;
    }
  });

  describe('getPackageManager', function () {
    it('returns npm by default', function () {
      delete process.env.USE_PNPM;
      assert.strictEqual(packageManager.getPackageManager(), 'npm');
    });

    it('returns npm when USE_PNPM is false', function () {
      process.env.USE_PNPM = 'false';
      assert.strictEqual(packageManager.getPackageManager(), 'npm');
    });

    it('returns npm when USE_PNPM is empty string', function () {
      process.env.USE_PNPM = '';
      assert.strictEqual(packageManager.getPackageManager(), 'npm');
    });

    it('returns pnpm when USE_PNPM is true', function () {
      process.env.USE_PNPM = 'true';
      assert.strictEqual(packageManager.getPackageManager(), 'pnpm');
    });
  });
});
