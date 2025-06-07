import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/toLong/#example}
 */
function test0() {
  type orders = {
    _id: number;
    item: string;
    qty: string | bson.Int32 | number | bson.Long;
  };

  const aggregation: schema.Pipeline<orders> = [
    { $addFields: { convertedQty: { $toLong: '$qty' } } },
    { $sort: { convertedQty: -1 } },
  ];
}
