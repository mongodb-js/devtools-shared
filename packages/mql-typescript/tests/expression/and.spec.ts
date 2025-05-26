import * as schema from '../../out/schema';

import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/and/#example}
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
      $project: {
        item: 1,
        qty: 1,
        result: { $and: [{ $gt: ['$qty', 100] }, { $lt: ['$qty', 250] }] },
      },
    },
  ];
}
