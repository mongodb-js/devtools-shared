/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/bitNot/#example}
 */
function test0() {
  type switches = {
    _id: number;
    a: bson.Int32 | number;
    b: bson.Int32 | number;
  };

  const aggregation: schema.Pipeline<switches> = [
    { $project: { result: { $bitNot: '$a' } } },
  ];
}
