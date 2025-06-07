import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/toString/#example}
 */
function test0() {
  type orders = {
    _id: number;
    item: string;
    qty: number;
    zipcode: number | string;
  };

  const aggregation: schema.Pipeline<orders> = [
    { $addFields: { convertedZipCode: { $toString: '$zipcode' } } },
    { $sort: { convertedZipCode: 1 } },
  ];
}
