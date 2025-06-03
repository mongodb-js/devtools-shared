import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/sin/#example}
 */
function test0() {
  type TestCollection = {
    _id: bson.ObjectId;
    angle_a: bson.Decimal128;
    hypotenuse: bson.Decimal128;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    {
      $addFields: {
        side_b: {
          $multiply: [
            { $sin: { $degreesToRadians: '$angle_a' } },
            '$hypotenuse',
          ],
        },
      },
    },
  ];
}
