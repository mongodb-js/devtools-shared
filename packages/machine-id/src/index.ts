import bindings from 'bindings';
import { createHash } from 'crypto';

const binding = bindings('machine_id');

export type GetMachineIdOptions = {
  /** If true, the machine ID will not be hashed with SHA256. */
  raw?: boolean;
};

function getMachineIdFromBinding(): string | undefined {
  try {
    return binding.getMachineId() || undefined;
  } catch {
    // If the binding fails, we can assume the machine ID is not available.
    return undefined;
  }
}

/**
 * Get the machine ID for the current system
 * @returns The machine ID (UUID) or undefined if not available
 */
export function getMachineId({ raw = false }: GetMachineIdOptions = {}):
  | string
  | undefined {
  const machineId: string | undefined = getMachineIdFromBinding();

  if (!machineId || raw === true) {
    return machineId;
  }

  return createHash('sha256').update(machineId).digest('hex');
}
