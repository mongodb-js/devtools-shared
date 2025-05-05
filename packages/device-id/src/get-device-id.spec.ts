import { expect } from 'chai';
import { getDeviceId } from './get-device-id';

describe('getDeviceId', function () {
  it('returns a hashed device id when machine id is available', async function () {
    const mockMachineId = 'test-machine-id';
    const getMachineId = () => Promise.resolve(mockMachineId);

    const deviceId = await getDeviceId({
      getMachineId,
      isNodeMachineId: false,
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
      isNodeMachineId: true,
    }).value;

    const resultB = await getDeviceId({
      getMachineId: () => Promise.resolve(mockMachineId.toUpperCase()),
      isNodeMachineId: true,
    }).value;

    expect(resultA).to.equal(resultB);
  });

  it('returns "unknown" when machine id is not found', async function () {
    const getMachineId = () => Promise.resolve(undefined);
    let capturedError: Error | undefined;

    const deviceId = await getDeviceId({
      getMachineId,
      isNodeMachineId: false,
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
      isNodeMachineId: false,
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
      isNodeMachineId: false,
    }).value;

    const resultB = await getDeviceId({
      getMachineId,
      isNodeMachineId: false,
    }).value;

    expect(resultA).to.equal(resultB);
  });

  it('handles timeout when getting machine id', async function () {
    let timeoutId: NodeJS.Timeout;
    const getMachineId = () =>
      new Promise<string>((resolve) => {
        timeoutId = setTimeout(() => resolve('delayed-id'), 10_000);
      });

    let errorCalled = false;
    const result = await getDeviceId({
      getMachineId,
      isNodeMachineId: false,
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

  it('handles external promise resolution', async function () {
    let timeoutId: NodeJS.Timeout;
    const getMachineId = () =>
      new Promise<string>((resolve) => {
        timeoutId = setTimeout(() => resolve('delayed-id'), 10_000);
      });

    const { resolve, value } = getDeviceId({
      getMachineId,
      isNodeMachineId: false,
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
      isNodeMachineId: false,
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
