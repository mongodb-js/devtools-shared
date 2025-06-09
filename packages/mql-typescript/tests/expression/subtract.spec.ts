/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Subtract Numbers
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/subtract/#subtract-numbers}
 */
function test0() {
  type sales = {
    _id: number;
    item: string;
    price: number;
    fee: number;
    discount: number;
    date: Date;
  };

  const aggregation: schema.Pipeline<sales> = [
    {
      $project: {
        item: 1,
        total: { $subtract: [{ $add: ['$price', '$fee'] }, '$discount'] },
      },
    },
  ];
}

/**
 * Subtract Two Dates
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/subtract/#subtract-two-dates}
 */
function test1() {
  type sales = {
    _id: number;
    item: string;
    price: number;
    fee: number;
    discount: number;
    date: Date;
  };

  const aggregation: schema.Pipeline<sales> = [
    {
      $project: { item: 1, dateDifference: { $subtract: ['$$NOW', '$date'] } },
    },
  ];
}

/**
 * Subtract Milliseconds from a Date
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/subtract/#subtract-milliseconds-from-a-date}
 */
function test2() {
  type sales = {
    _id: number;
    item: string;
    price: number;
    fee: number;
    discount: number;
    date: Date;
  };

  const aggregation: schema.Pipeline<sales> = [
    { $project: { item: 1, dateDifference: { $subtract: ['$date', 300000] } } },
  ];
}
