import { createHmac } from 'crypto';
import { expect } from 'chai';
import { getDeviceId } from './get-device-id';

// Replicates machineid.ProtectedID(appID) from github.com/denisbrodbeck/machineid:
// https://github.com/denisbrodbeck/machineid/blob/master/helper.go
// HMAC-SHA256(key=rawMachineId, message=appID), no case normalization.
function atlasCLIDeviceId(rawMachineId: string): string {
  return createHmac('sha256', rawMachineId).update('atlascli').digest('hex');
}

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

  it('produces different hashes for lower and uppercase machine ids', async function () {
    const mockMachineId = 'test-machine-id';

    const resultA = await getDeviceId({
      getMachineId: () => Promise.resolve(mockMachineId),
    });

    const resultB = await getDeviceId({
      getMachineId: () => Promise.resolve(mockMachineId.toUpperCase()),
    });

    expect(resultA).to.not.equal(resultB);
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

  describe('Atlas CLI compatibility', function () {
    // Machine IDs format (case and hyphens) matter to catch case normalization bug.
    const cases = [
      {
        platform: 'Linux',
        // /etc/machine-id is always lowercase hex without hyphens
        rawMachineId: 'a8098c1af14ef2e1dc4d7f5b4e08d4c0',
      },
      {
        platform: 'macOS',
        // IOPlatformUUID from IOKit is uppercase with hyphens
        rawMachineId: 'A8098C1A-F14E-F2E1-DC4D-7F5B4E08D4C0',
      },
      {
        platform: 'Windows',
        // MachineGuid from HKLM\SOFTWARE\Microsoft\Cryptography is lowercase with hyphens
        rawMachineId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      },
    ];

    for (const { platform, rawMachineId } of cases) {
      it(`matches Atlas CLI output for ${platform} machine id format`, async function () {
        const result = await getDeviceId({
          getMachineId: () => Promise.resolve(rawMachineId),
        });
        expect(result).to.equal(atlasCLIDeviceId(rawMachineId));
      });
    }
  });
});
