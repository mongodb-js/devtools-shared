import bitfield from 'sparse-bitfield';

export function createMemoryCodePoints(data: Buffer) {
  let offset = 0;

  /**
   * Loads each code points sequence from buffer.
   */
  function read(): bitfield.BitFieldInstance {
    const size = data.readUInt32BE(offset);
    offset += 4;

    const codepoints = data.slice(offset, offset + size);
    offset += size;

    return bitfield({ buffer: codepoints });
  }

  const unassigned_code_points = read();
  const commonly_mapped_to_nothing = read();
  const non_ASCII_space_characters = read();
  const prohibited_characters = read();
  const bidirectional_r_al = read();
  const bidirectional_l = read();

  return {
    unassigned_code_points,
    commonly_mapped_to_nothing,
    non_ASCII_space_characters,
    prohibited_characters,
    bidirectional_r_al,
    bidirectional_l,
  };
}
