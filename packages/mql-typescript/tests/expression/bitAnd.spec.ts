/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Bitwise AND with Two Integers
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/bitAnd/#bitwise-and-with-two-integers}
 */
function test0() {
  type switches = {
    _id: number;
    a: bson.Int32 | number;
    b: bson.Int32 | number;
  };

  const aggregation: schema.Pipeline<switches> = [
    { $project: { result: { $bitAnd: ['$a', '$b'] } } },
  ];
}

/**
 * Bitwise AND with a Long and Integer
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/bitAnd/#bitwise-and-with-a-long-and-integer}
 */
function test1() {
  type switches = {
    _id: number;
    a: bson.Int32 | number;
    b: bson.Int32 | number;
  };

  const aggregation: schema.Pipeline<switches> = [
    { $project: { result: { $bitAnd: ['$a', new bson.Long('63')] } } },
  ];
}
