import { createHmac } from 'crypto';

export function getDeviceId({
  getMachineId,
  onError,
  timeout = 3000,
  abortSignal,
  fallbackValue = 'unknown',
}: GetDeviceIdOptions): Promise<string> {
  let timeoutId: NodeJS.Timeout | undefined;

  const value = Promise.race([
    resolveMachineId({
      getMachineId,
      onError,
    }),
    new Promise<string>((resolve) => {
      abortSignal?.addEventListener('abort', () => {
        onError?.('abort', new Error('Aborted by abort signal'));
        resolve(fallbackValue);
      });

      timeoutId = setTimeout(() => {
        onError?.('timeout', new Error(`Timeout reached after ${timeout} ms`));
        resolve(fallbackValue);
      }, timeout).unref?.();
    }),
  ]).finally(() => clearTimeout(timeoutId));

  return value;
}

export type GetDeviceIdOptions = {
  /** A function that returns a raw machine ID. */
  getMachineId: () => Promise<string | undefined>;

  /** Runs when an error occurs while getting the machine ID. */
  onError?: (
    reason: 'abort' | 'timeout' | 'resolutionError',
    error: Error,
  ) => void;

  /** Timeout in milliseconds. Defaults to 3000ms. Set to `undefined` to disable. */
  timeout?: number | undefined;

  /**
   * An optional abort signal that will cancel the async device ID resolution and will
   * cause getDeviceId to resolve immediately with the value of `fallbackValue`.
   */
  abortSignal?: AbortSignal;

  /**
   * An optional fallback value that will be returned if the abort signal is triggered
   * or the timeout is reached. Defaults to "unknown".
   */
  fallbackValue?: string;
};

async function resolveMachineId({
  getMachineId,
  onError,
}: GetDeviceIdOptions): Promise<string> {
  try {
    const originalId = (await getMachineId())?.toUpperCase();

    if (!originalId) {
      onError?.('resolutionError', new Error('Failed to resolve machine ID'));
      return 'unknown';
    }

    // Create a hashed format from the machine ID
    // to match it exactly with the denisbrodbeck/machineid library that Atlas CLI uses.
    const hmac = createHmac('sha256', originalId);

    /** This matches the message used to create the hashes in Atlas CLI */
    const DEVICE_ID_HASH_MESSAGE = 'atlascli';

    hmac.update(DEVICE_ID_HASH_MESSAGE);
    return hmac.digest('hex');
  } catch (error) {
    onError?.('resolutionError', error as Error);
    return 'unknown';
  }
}
