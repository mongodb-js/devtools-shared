/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/asinh/#example}
 */
function test0() {
  type TestCollection = {
    _id: bson.ObjectId;
    'x-coordinate': bson.Decimal128;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    {
      $addFields: {
        'y-coordinate': { $radiansToDegrees: { $asinh: '$x-coordinate' } },
      },
    },
  ];
}
