/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/cmp/#example}
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
      $project: { item: 1, qty: 1, cmpTo250: { $cmp: ['$qty', 250] }, _id: 0 },
    },
  ];
}
