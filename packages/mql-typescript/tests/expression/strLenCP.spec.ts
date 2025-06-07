import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Single-Byte and Multibyte Character Set
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/strLenBytes/#single-byte-and-multibyte-character-set}
 */
function test0() {
  type food = {
    _id: number;
    name: string;
  };

  const aggregation: schema.Pipeline<food> = [
    { $project: { name: 1, length: { $strLenCP: '$name' } } },
  ];
}
