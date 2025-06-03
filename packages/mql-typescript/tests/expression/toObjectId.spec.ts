import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/toObjectId/#example}
 */
function test0() {
  type orders = {
    _id: string | bson.ObjectId;
    item: string;
    qty: number;
  };

  const aggregation: schema.Pipeline<orders> = [
    { $addFields: { convertedId: { $toObjectId: '$_id' } } },
    { $sort: { convertedId: -1 } },
  ];
}
