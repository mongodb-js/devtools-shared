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
});
