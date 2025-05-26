import * as schema from '../../out/schema';

import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/cond/#example}
 */
function test0() {
  type TestCollection = {
    _id: number;
    item: string;
    qty: number;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    {
      $project: {
        item: 1,
        discount: {
          $cond: { if: { $gte: ['$qty', 250] }, then: 30, else: 20 },
        },
      },
    },
  ];
}
