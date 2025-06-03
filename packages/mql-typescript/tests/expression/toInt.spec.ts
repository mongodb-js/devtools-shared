import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/toInt/#example}
 */
function test0() {
  type orders = {
    _id: number;
    item: string;
    qty: string;
    price: number | bson.Decimal128 | string;
  };

  const aggregation: schema.Pipeline<orders> = [
    { $addFields: { convertedQty: { $toInt: '$qty' } } },
  ];
}
