/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexOfArray/#example}
 */
function test0() {
  type inventory = {
    _id: number;
    items: Array<number | null | string> | null;
    amount: number;
  };

  const aggregation: schema.Pipeline<inventory> = [
    { $project: { index: { $indexOfArray: ['$items', 2] } } },
  ];
}
