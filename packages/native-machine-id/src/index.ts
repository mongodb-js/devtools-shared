import { createHash } from 'crypto';
import { promisify } from 'util';

type NativeMachineIdModule = {
  getMachineIdSync: () => string;
  getMachineIdAsync: (cb: (err: unknown, id: string) => void) => void;
}

const binding = (() => {
  try {
    return require('../build/Release/native_machine_id.node') as NativeMachineIdModule;
  } catch (outerError) {
    try {
      return require('../build/Debug/native_machine_id.node') as NativeMachineIdModule;
    } catch {
      throw outerError;
    }
  }
})();

function getMachineIdFromBindingSync(): string | undefined {
  try {
    return binding.getMachineIdSync() || undefined;
  } catch {
    // If the binding fails, we can assume the machine ID is not available.
    return undefined;
  }
}

async function getMachineIdFromBindingAsync(): Promise<string | undefined> {
  try {
    const deviceId =
      (await promisify(binding.getMachineIdAsync)()) || undefined;

    return deviceId;
  } catch {
    // If the binding fails, we can assume the machine ID is not available.
    return undefined;
  }
}

export type GetMachineIdOptions = {
  /** If true, the machine ID will not be hashed with SHA256. */
  raw?: boolean;
};

/**
 * Get the machine ID for the current system
 * @returns A promise that resolves to the machine ID or `undefined` if not available
 */
export async function getMachineId({
  raw = false,
}: GetMachineIdOptions = {}): Promise<string | undefined> {
  const machineId = await getMachineIdFromBindingAsync();

  if (!machineId || raw === true) {
    return machineId;
  }

  return createHash('sha256').update(machineId).digest('hex');
}

/**
 * Get the machine ID for the current system synchronously
 * @returns The machine ID or `undefined` if not available
 */
export function getMachineIdSync({ raw = false }: GetMachineIdOptions = {}):
  | string
  | undefined {
  const machineId = getMachineIdFromBindingSync();

  if (!machineId || raw === true) {
    return machineId;
  }

  return createHash('sha256').update(machineId).digest('hex');
}
