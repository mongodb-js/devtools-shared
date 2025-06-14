/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Shift Using a Positive Integer
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/shift/#shift-using-a-positive-integer}
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
        output: {
          shiftQuantityForState: {
            $shift: { output: '$quantity', by: 1, default: 'Not available' },
          },
        },
      },
    },
  ];
}

/**
 * Shift Using a Negative Integer
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/shift/#shift-using-a-negative-integer}
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
        sortBy: { quantity: -1 },
        output: {
          shiftQuantityForState: {
            $shift: { output: '$quantity', by: -1, default: 'Not available' },
          },
        },
      },
    },
  ];
}
