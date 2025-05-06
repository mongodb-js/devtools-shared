import { createHmac } from 'crypto';

export function getDeviceId({
  getMachineId,
  onError,
  timeout = 3000,
  onTimeout,
}: GetDeviceIdOptions): {
  /** A promise that resolves to the hashed device ID or `"unknown"` if an error or timeout occurs. */
  value: Promise<string>;
  /** A function which resolves the device ID promise. */
  resolve: (value: string) => void;
  /** A function which rejects the device ID promise. */
  reject: (err: Error) => void;
} {
  let resolveDeviceId!: (value: string) => void;
  let rejectDeviceId!: (err: Error) => void;
  let timeoutId: NodeJS.Timeout | undefined;

  const value = Promise.race([
    resolveMachineId({
      getMachineId,
      onError,
    }),
    new Promise<string>((resolve, reject) => {
      timeoutId = setTimeout(() => {
        try {
          resolve(onTimeout?.() ?? 'unknown');
        } catch (error) {
          reject(error);
        }
      }, timeout).unref?.();

      resolveDeviceId = resolve;
      rejectDeviceId = reject;
    }),
  ]).finally(() => clearTimeout(timeoutId));

  return {
    value,
    resolve: resolveDeviceId,
    reject: rejectDeviceId,
  };
}

export type GetDeviceIdOptions = {
  /** A function that returns a raw machine ID. */
  getMachineId: () => Promise<string | undefined>;
  /** Runs when an error occurs while getting the machine ID. */
  onError?: (error: Error) => void;
  /** Timeout in milliseconds. Defaults to 3000ms. Set to `undefined` to disable. */
  timeout?: number | undefined;
  /** Runs when the timeout is reached. By default, resolves to "unknown". */
  onTimeout?: () => PromiseLike<string> | string;
};

async function resolveMachineId({
  getMachineId,
  onError,
}: GetDeviceIdOptions): Promise<string> {
  try {
    const originalId = (await getMachineId())?.toUpperCase();

    if (!originalId) {
      onError?.(new Error('Failed to resolve machine ID'));
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
    onError?.(error as Error);
    return 'unknown';
  }
}
