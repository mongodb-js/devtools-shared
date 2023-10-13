import { BitField } from './sparse-bitfield';
import * as codePoints from './code-points-src';

const unassigned_code_points = new BitField();
const commonly_mapped_to_nothing = new BitField();
const non_ascii_space_characters = new BitField();
const prohibited_characters = new BitField();
const bidirectional_r_al = new BitField();
const bidirectional_l = new BitField();

/**
 * Iterate over code points and
 * convert it into an buffer.
 */
function traverse(bits: BitField, src: Set<number>): Uint8Array {
  for (const code of src.keys()) {
    bits.set(code, true);
  }

  const buffer = bits.toBuffer();
  return prependSize(buffer);
}

function prependSize(buffer: Uint8Array): Uint8Array {
  const buf = new Uint8Array(4 + buffer.byteLength);
  new DataView(buf.buffer, buf.byteOffset, buf.byteLength).setUint32(
    0,
    buffer.byteLength,
    false
  );
  buf.set(buffer, 4);
  return buf;
}

const memory: Uint8Array[] = [];

memory.push(
  traverse(unassigned_code_points, codePoints.unassigned_code_points),
  traverse(commonly_mapped_to_nothing, codePoints.commonly_mapped_to_nothing),
  traverse(non_ascii_space_characters, codePoints.non_ASCII_space_characters),
  traverse(prohibited_characters, codePoints.prohibited_characters),
  traverse(bidirectional_r_al, codePoints.bidirectional_r_al),
  traverse(bidirectional_l, codePoints.bidirectional_l)
);

declare const Buffer: any;

// eslint-disable-next-line no-console
console.log(
  `export default Uint8Array.from(atob(
  ${JSON.stringify(Buffer.concat(memory).toString('base64'))}
), c => c.charCodeAt(0));`
);
