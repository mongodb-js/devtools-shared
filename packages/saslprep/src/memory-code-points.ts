import bitfield from 'sparse-bitfield';
import memory from './code-points-data';

let offset = 0;

/**
 * Loads each code points sequence from buffer.
 */
function read(): bitfield.BitFieldInstance {
  const size = memory.readUInt32BE(offset);
  offset += 4;

  const codepoints = memory.slice(offset, offset + size);
  offset += size;

  return bitfield({ buffer: codepoints });
}

export const unassigned_code_points = read();
export const commonly_mapped_to_nothing = read();
export const non_ASCII_space_characters = read();
export const prohibited_characters = read();
export const bidirectional_r_al = read();
export const bidirectional_l = read();
