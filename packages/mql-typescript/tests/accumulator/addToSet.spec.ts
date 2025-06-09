/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Use in $group Stage
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/addToSet/#use-in--group-stage}
 */
function test0() {
  type sales = {
    _id: number;
    item: string;
    price: number;
    quantity: number;
    date: Date;
  };

  const aggregation: schema.Pipeline<sales> = [
    {
      $group: {
        _id: {
          day: { $dayOfYear: { date: '$date' } },
          year: { $year: { date: '$date' } },
        },
        itemsSold: { $addToSet: '$item' },
      },
    },
  ];
}

/**
 * Use in $setWindowFields Stage
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/addToSet/#use-in--setwindowfields-stage}
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
        output: {
          cakeTypesForState: {
            $addToSet: '$type',
            window: { documents: ['unbounded', 'current'] },
          },
        },
      },
    },
  ];
}
