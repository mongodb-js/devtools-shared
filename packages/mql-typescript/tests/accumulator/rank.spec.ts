/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Rank Partitions by an Integer Field
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/rank/#rank-partitions-by-an-integer-field}
 */
function test0() {
  type cakeSales = {
    _id: number;
    type: string;
    orderDate: Date;
    state: string;
    price: number;
    quantity: number;
  };

  const aggregation: schema.Pipeline<cakeSales> = [
    {
      $setWindowFields: {
        partitionBy: '$state',
        sortBy: { quantity: -1 },
        output: { rankQuantityForState: { $rank: {} } },
      },
    },
  ];
}

/**
 * Rank Partitions by a Date Field
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/rank/#rank-partitions-by-a-date-field}
 */
function test1() {
  type cakeSales = {
    _id: number;
    type: string;
    orderDate: Date;
    state: string;
    price: number;
    quantity: number;
  };

  const aggregation: schema.Pipeline<cakeSales> = [
    {
      $setWindowFields: {
        partitionBy: '$state',
        sortBy: { orderDate: 1 },
        output: { rankOrderDateForState: { $rank: {} } },
      },
    },
  ];
}
