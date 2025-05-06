import { expect } from 'chai';
import { getDeviceId } from './get-device-id';

describe('getDeviceId', function () {
  it('returns a hashed device id when machine id is available', async function () {
    const mockMachineId = 'test-machine-id';
    const getMachineId = () => Promise.resolve(mockMachineId);

    const deviceId = await getDeviceId({
      getMachineId,
    }).value;

    expect(deviceId).to.be.a('string');
    expect(deviceId).to.have.lengthOf(64); // SHA-256 hex digest length
    expect(deviceId).to.not.equal('unknown');
  });

  it('converts machine id to uppercase when using node-machine-id', async function () {
    const mockMachineId = 'test-machine-id';
    const getMachineId = () => Promise.resolve(mockMachineId);

    const resultA = await getDeviceId({
      getMachineId,
    }).value;

    const resultB = await getDeviceId({
      getMachineId: () => Promise.resolve(mockMachineId.toUpperCase()),
    }).value;

    expect(resultA).to.equal(resultB);
  });

  it('returns "unknown" when machine id is not found', async function () {
    const getMachineId = () => Promise.resolve(undefined);
    let capturedError: Error | undefined;

    const deviceId = await getDeviceId({
      getMachineId,
      onError: (error) => {
        capturedError = error;
      },
    }).value;

    expect(deviceId).to.equal('unknown');
    expect(capturedError?.message).to.equal('Failed to resolve machine ID');
  });

  it('returns "unknown" and calls onError when getMachineId throws', async function () {
    const error = new Error('Something went wrong');
    const getMachineId = () => Promise.reject(error);
    let capturedError: Error | undefined;

    const result = await getDeviceId({
      getMachineId,
      onError: (err) => {
        capturedError = err;
      },
    }).value;

    expect(result).to.equal('unknown');
    expect(capturedError).to.equal(error);
  });

  it('produces consistent hash for the same machine id', async function () {
    const mockMachineId = 'test-machine-id';
    const getMachineId = () => Promise.resolve(mockMachineId);

    const resultA = await getDeviceId({
      getMachineId,
    }).value;

    const resultB = await getDeviceId({
      getMachineId,
    }).value;

    expect(resultA).to.equal(resultB);
  });

  it('resolves timeout with "unknown" by default', async function () {
    let timeoutId: NodeJS.Timeout;
    const getMachineId = () =>
      new Promise<string>((resolve) => {
        timeoutId = setTimeout(() => resolve('delayed-id'), 10_000);
      });

    let errorCalled = false;
    const result = await getDeviceId({
      getMachineId,
      onError: () => {
        errorCalled = true;
      },
      timeout: 1,
    }).value;

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    clearTimeout(timeoutId!);
    expect(result).to.equal('unknown');
    expect(errorCalled).to.equal(false);
  });

  it('resolves with result of onTimeout when successful', async function () {
    let timeoutId: NodeJS.Timeout;
    const getMachineId = () =>
      new Promise<string>((resolve) => {
        timeoutId = setTimeout(() => resolve('delayed-id'), 10_000);
      });

    let errorCalled = false;
    const result = await getDeviceId({
      getMachineId,
      onError: () => {
        errorCalled = true;
      },
      timeout: 1,
      onTimeout: () => {
        return 'abc-123';
      },
    }).value;

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    clearTimeout(timeoutId!);
    expect(result).to.equal('abc-123');
    expect(errorCalled).to.equal(false);
  });

  it('rejects with an error if onTimeout throws', async function () {
    let timeoutId: NodeJS.Timeout;
    const getMachineId = () =>
      new Promise<string>((resolve) => {
        timeoutId = setTimeout(() => resolve('delayed-id'), 10_000);
      });

    let errorCalled = false;
    try {
      const result = await getDeviceId({
        getMachineId,
        onError: () => {
          errorCalled = true;
        },
        timeout: 1,
        onTimeout: () => {
          throw new Error('Operation timed out');
        },
      }).value;
      expect.fail('Expected promise to be rejected');
    } catch (error) {
      expect((error as Error).message).to.equal('Operation timed out');
      expect(errorCalled).to.equal(false);
    }
  });

  it('handles external promise resolution', async function () {
    let timeoutId: NodeJS.Timeout;
    const getMachineId = () =>
      new Promise<string>((resolve) => {
        timeoutId = setTimeout(() => resolve('delayed-id'), 10_000);
      });

    const { resolve, value } = getDeviceId({
      getMachineId,
    });

    resolve('external-id');

    const result = await value;

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    clearTimeout(timeoutId!);
    expect(result).to.be.a('string');
    expect(result).to.equal('external-id');
    expect(result).to.not.equal('unknown');
  });

  it('handles external promise rejection', async function () {
    let timeoutId: NodeJS.Timeout;
    const getMachineId = () =>
      new Promise<string>((resolve) => {
        timeoutId = setTimeout(() => resolve('delayed-id'), 10_000);
      });

    const error = new Error('External rejection');

    const { reject, value } = getDeviceId({
      getMachineId,
    });

    reject(error);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    clearTimeout(timeoutId!);
    try {
      await value;
      expect.fail('Expected promise to be rejected');
    } catch (e) {
      expect(e).to.equal(error);
    }
  });
});
