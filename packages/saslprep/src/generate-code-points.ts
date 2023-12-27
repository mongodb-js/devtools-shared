import { gzipSync } from 'zlib';
import bitfield from 'sparse-bitfield';
import * as codePoints from './code-points-src';
import { createWriteStream } from 'fs';

if (!process.env.GENERATE_CODE_POINTS) {
  // TODO(COMPASS-7555): fix codepoint generation=
  process.exitCode = 0;
  process.exit();
}

const unassigned_code_points = bitfield();
const commonly_mapped_to_nothing = bitfield();
const non_ascii_space_characters = bitfield();
const prohibited_characters = bitfield();
const bidirectional_r_al = bitfield();
const bidirectional_l = bitfield();

/**
 * Iterare over code points and
 * convert it into an buffer.
 */
function traverse(bits: bitfield.BitFieldInstance, src: Set<number>): Buffer {
  for (const code of src.keys()) {
    bits.set(code, true);
  }

  const buffer = bits.toBuffer();
  return Buffer.concat([createSize(buffer), buffer]);
}

function createSize(buffer: Buffer): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(buffer.length);

  return buf;
}

const memory: Buffer[] = [];

memory.push(
  traverse(unassigned_code_points, codePoints.unassigned_code_points),
  traverse(commonly_mapped_to_nothing, codePoints.commonly_mapped_to_nothing),
  traverse(non_ascii_space_characters, codePoints.non_ASCII_space_characters),
  traverse(prohibited_characters, codePoints.prohibited_characters),
  traverse(bidirectional_r_al, codePoints.bidirectional_r_al),
  traverse(bidirectional_l, codePoints.bidirectional_l)
);

const fsStream = createWriteStream(process.argv[2]);
fsStream.write(
  `import { gunzipSync } from 'zlib';

export default gunzipSync(
  Buffer.from(
    '${gzipSync(Buffer.concat(memory), { level: 9 }).toString('base64')}',
    'base64'
  )
);
`
);
