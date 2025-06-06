import { expect } from 'chai';
import { getDeviceId } from './get-device-id';

describe('getDeviceId', function () {
  it('returns a hashed device id when machine id is available', async function () {
    const mockMachineId = 'test-machine-id';
    const getMachineId = () => Promise.resolve(mockMachineId);

    const deviceId = await getDeviceId({
      getMachineId,
    });

    expect(deviceId).to.be.a('string');
    expect(deviceId).to.have.lengthOf(64); // SHA-256 hex digest length
    expect(deviceId).to.not.equal('unknown');
  });

  it('converts machine id to uppercase when using node-machine-id', async function () {
    const mockMachineId = 'test-machine-id';
    const getMachineId = () => Promise.resolve(mockMachineId);

    const resultA = await getDeviceId({
      getMachineId,
    });

    const resultB = await getDeviceId({
      getMachineId: () => Promise.resolve(mockMachineId.toUpperCase()),
    });

    expect(resultA).to.equal(resultB);
  });

  it('returns "unknown" when machine id is not found', async function () {
    const getMachineId = () => Promise.resolve(undefined);
    let capturedError: [string, Error] | undefined;

    const deviceId = await getDeviceId({
      getMachineId,
      onError: (reason, error) => {
        capturedError = [reason, error];
      },
    });

    expect(deviceId).to.equal('unknown');
    expect(capturedError?.[0]).to.equal('resolutionError');
    expect(capturedError?.[1].message).to.equal('Failed to resolve machine ID');
  });

  it('returns "unknown" and calls onError when getMachineId throws', async function () {
    const error = new Error('Something went wrong');
    const getMachineId = () => Promise.reject(error);
    let capturedError: [string, Error] | undefined;

    const result = await getDeviceId({
      getMachineId,
      onError: (reason, err) => {
        capturedError = [reason, err];
      },
    });

    expect(result).to.equal('unknown');
    expect(capturedError?.[0]).to.equal('resolutionError');
    expect(capturedError?.[1]).to.equal(error);
  });

  it('produces consistent hash for the same machine id', async function () {
    const mockMachineId = 'test-machine-id';
    const getMachineId = () => Promise.resolve(mockMachineId);

    const resultA = await getDeviceId({
      getMachineId,
    });

    const resultB = await getDeviceId({
      getMachineId,
    });

    expect(resultA).to.equal(resultB);
  });

  const fallbackTestCases: {
    fallbackValue?: string;
    expectedResult: string;
  }[] = [
    { expectedResult: 'unknown' },
    { fallbackValue: 'fallback-id', expectedResult: 'fallback-id' },
  ];

  describe('when timed out', function () {
    for (const testCase of fallbackTestCases) {
      it(`resolves with ${testCase.expectedResult} when fallback value is ${testCase.fallbackValue ?? 'undefined'}`, async function () {
        let timeoutId: NodeJS.Timeout;
        const getMachineId = () =>
          new Promise<string>((resolve) => {
            timeoutId = setTimeout(() => resolve('delayed-id'), 10_000);
          });

        let capturedError: [string, Error] | undefined;
        const result = await getDeviceId({
          getMachineId,
          onError: (reason, error) => {
            capturedError = [reason, error];
          },
          timeout: 5,
          fallbackValue: testCase.fallbackValue,
        });

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        clearTimeout(timeoutId!);
        expect(result).to.equal(testCase.expectedResult);
        expect(capturedError?.[0]).to.equal('timeout');
        expect(capturedError?.[1].message).to.equal(
          'Timeout reached after 5 ms',
        );
      });
    }
  });

  describe('when aborted', function () {
    for (const testCase of fallbackTestCases) {
      it(`resolves with ${testCase.expectedResult} when fallback value is ${testCase.fallbackValue ?? 'undefined'}`, async function () {
        let timeoutId: NodeJS.Timeout;
        const getMachineId = () =>
          new Promise<string>((resolve) => {
            timeoutId = setTimeout(() => resolve('delayed-id'), 10_000);
          });

        let capturedError: [string, Error] | undefined;
        const abortController = new AbortController();
        const value = getDeviceId({
          getMachineId,
          abortSignal: abortController.signal,
          onError: (reason, error) => {
            capturedError = [reason, error];
          },
          fallbackValue: testCase.fallbackValue,
        });

        abortController.abort();

        const result = await value;

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        clearTimeout(timeoutId!);
        expect(result).to.be.a('string');
        expect(result).to.equal(testCase.expectedResult);
        expect(capturedError?.[0]).to.equal('abort');
        expect(capturedError?.[1].message).to.equal('Aborted by abort signal');
      });
    }
  });
});
