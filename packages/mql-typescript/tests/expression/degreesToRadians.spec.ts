/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/degreesToRadians/#example}
 */
function test0() {
  type TestCollection = {
    angle_a: bson.Decimal128;
    angle_b: bson.Decimal128;
    angle_c: bson.Decimal128;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    {
      $addFields: {
        angle_a_rad: { $degreesToRadians: '$angle_a' },
        angle_b_rad: { $degreesToRadians: '$angle_b' },
        angle_c_rad: { $degreesToRadians: '$angle_c' },
      },
    },
  ];
}
