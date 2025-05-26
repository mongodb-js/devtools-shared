import * as schema from '../../out/schema';

import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/sinh/#example}
 */
function test0() {
  type trigonometry = {
    _id: bson.ObjectId;
    angle: bson.Decimal128;
  };

  const aggregation: schema.Pipeline<trigonometry> = [
    { $addFields: { sinh_output: { $sinh: { $degreesToRadians: '$angle' } } } },
  ];
}
