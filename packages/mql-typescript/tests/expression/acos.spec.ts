import * as schema from '../../out/schema';

import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/acos/#example}
 */
function test0() {
  type TestCollection = {
    _id: bson.ObjectId;
    side_a: bson.Decimal128;
    side_b: bson.Decimal128;
    hypotenuse: bson.Decimal128;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    {
      $addFields: {
        angle_a: {
          $radiansToDegrees: { $acos: { $divide: ['$side_b', '$hypotenuse'] } },
        },
      },
    },
  ];
}
