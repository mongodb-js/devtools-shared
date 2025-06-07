import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Bitwise OR with Two Integers
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/bitOr/#bitwise-or-with-two-integers}
 */
function test0() {
  type switches = {
    _id: number;
    a: bson.Int32 | number;
    b: bson.Int32 | number;
  };

  const aggregation: schema.Pipeline<switches> = [
    { $project: { result: { $bitOr: ['$a', '$b'] } } },
  ];
}

/**
 * Bitwise OR with a Long and Integer
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/bitOr/#bitwise-or-with-a-long-and-integer}
 */
function test1() {
  type switches = {
    _id: number;
    a: bson.Int32 | number;
    b: bson.Int32 | number;
  };

  const aggregation: schema.Pipeline<switches> = [
    { $project: { result: { $bitOr: ['$a', { $numberLong: '63' }] } } },
  ];
}
