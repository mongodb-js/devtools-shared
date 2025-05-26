import * as schema from '../../out/schema';

import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/bitXor/#example}
 */
function test0() {
  type switches = {
    _id: number;
    a: bson.Int32;
    b: bson.Int32;
  };

  const aggregation: schema.Pipeline<switches> = [
    { $project: { result: { $bitXor: ['$a', '$b'] } } },
  ];
}
