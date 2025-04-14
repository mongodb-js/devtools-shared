import bindings from "bindings";
import { createHash } from "crypto";

const binding = bindings("machine_id");

/**
 * Get the machine ID for the current system
 * @param skipHash - If true, the machine ID will not be hashed with SHA256.
 * @returns The machine ID (UUID) or undefined if not available
 */
export function getMachineId(skipHash = false): string {
  const machineId: string = binding.getMachineId() as string;

  if (skipHash === true) {
    return machineId;
  }

  return createHash("sha256").update(machineId).digest("hex");
}
