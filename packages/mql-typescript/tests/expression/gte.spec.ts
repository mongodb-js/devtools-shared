import * as schema from '../../out/schema';

import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/gte/#example}
 */
function test0() {
  type inventory = {
    _id: number;
    item: string;
    description: string;
    qty: number;
  };

  const aggregation: schema.Pipeline<inventory> = [
    {
      $project: { item: 1, qty: 1, qtyGte250: { $gte: ['$qty', 250] }, _id: 0 },
    },
  ];
}
