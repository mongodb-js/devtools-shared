/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Report 1 All Sales by Year and Stores and Items
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/unionWith/#report-1--all-sales-by-year-and-stores-and-items}
 */
function test0() {
  type sales_2017 = {
    store: string;
    item: string;
    quantity: number;
  };

  const aggregation: schema.Pipeline<sales_2017> = [
    { $set: { _id: '2017' } },
    {
      $unionWith: { coll: 'sales_2018', pipeline: [{ $set: { _id: '2018' } }] },
    },
    {
      $unionWith: { coll: 'sales_2019', pipeline: [{ $set: { _id: '2019' } }] },
    },
    {
      $unionWith: { coll: 'sales_2020', pipeline: [{ $set: { _id: '2020' } }] },
    },
    { $sort: { _id: 1, store: 1, item: 1 } },
  ];
}

/**
 * Report 2 Aggregated Sales by Items
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/unionWith/#report-2--aggregated-sales-by-items}
 */
function test1() {
  type sales_2017 = {
    store: string;
    item: string;
    quantity: number;
  };

  const aggregation: schema.Pipeline<sales_2017> = [
    { $unionWith: { coll: 'sales_2018' } },
    { $unionWith: { coll: 'sales_2019' } },
    { $unionWith: { coll: 'sales_2020' } },
    { $group: { _id: '$item', total: { $sum: '$quantity' } } },
    { $sort: { total: -1 } },
  ];
}
