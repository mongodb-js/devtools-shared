/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Use Documents Window to Obtain Cumulative Quantity for Each State
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/#use-documents-window-to-obtain-cumulative-quantity-for-each-state}
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
        sortBy: { orderDate: 1 },
        output: {
          cumulativeQuantityForState: {
            $sum: '$quantity',
            window: { documents: ['unbounded', 'current'] },
          },
        },
      },
    },
  ];
}

/**
 * Use Documents Window to Obtain Cumulative Quantity for Each Year
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/#use-documents-window-to-obtain-cumulative-quantity-for-each-year}
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
        partitionBy: { $year: { date: '$orderDate' } },
        sortBy: { orderDate: 1 },
        output: {
          cumulativeQuantityForYear: {
            $sum: '$quantity',
            window: { documents: ['unbounded', 'current'] },
          },
        },
      },
    },
  ];
}

/**
 * Use Documents Window to Obtain Moving Average Quantity for Each Year
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/#use-documents-window-to-obtain-moving-average-quantity-for-each-year}
 */
function test2() {
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
        partitionBy: { $year: { date: '$orderDate' } },
        sortBy: { orderDate: 1 },
        output: {
          averageQuantity: {
            $avg: '$quantity',
            window: { documents: [-1, 0] },
          },
        },
      },
    },
  ];
}

/**
 * Use Documents Window to Obtain Cumulative and Maximum Quantity for Each Year
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/#use-documents-window-to-obtain-cumulative-and-maximum-quantity-for-each-year}
 */
function test3() {
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
        partitionBy: { $year: { date: '$orderDate' } },
        sortBy: { orderDate: 1 },
        output: {
          cumulativeQuantityForYear: {
            $sum: '$quantity',
            window: { documents: ['unbounded', 'current'] },
          },
          maximumQuantityForYear: {
            $max: '$quantity',
            window: { documents: ['unbounded', 'unbounded'] },
          },
        },
      },
    },
  ];
}

/**
 * Range Window Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/#range-window-example}
 */
function test4() {
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
        sortBy: { price: 1 },
        output: {
          quantityFromSimilarOrders: {
            $sum: '$quantity',
            window: { range: [-10, 10] },
          },
        },
      },
    },
  ];
}

/**
 * Use a Time Range Window with a Positive Upper Bound
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/#use-a-time-range-window-with-a-positive-upper-bound}
 */
function test5() {
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
          recentOrders: {
            $push: '$orderDate',
            window: { range: ['unbounded', 10], unit: 'month' },
          },
        },
      },
    },
  ];
}

/**
 * Use a Time Range Window with a Negative Upper Bound
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/#use-a-time-range-window-with-a-negative-upper-bound}
 */
function test6() {
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
          recentOrders: {
            $push: '$orderDate',
            window: { range: ['unbounded', -10], unit: 'month' },
          },
        },
      },
    },
  ];
}
