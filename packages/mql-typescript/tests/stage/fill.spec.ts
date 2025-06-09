/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Fill Missing Field Values with a Constant Value
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/fill/#fill-missing-field-values-with-a-constant-value}
 */
function test0() {
  type dailySales = {
    date: Date;
    bootsSold: number;
    sandalsSold: number;
    sneakersSold: number;
  };

  const aggregation: schema.Pipeline<dailySales> = [
    {
      $fill: {
        output: {
          bootsSold: { value: 0 },
          sandalsSold: { value: 0 },
          sneakersSold: { value: 0 },
        },
      },
    },
  ];
}

/**
 * Fill Missing Field Values with Linear Interpolation
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/fill/#fill-missing-field-values-with-linear-interpolation}
 */
function test1() {
  type stock = {
    time: Date;
    price: number;
  };

  const aggregation: schema.Pipeline<stock> = [
    { $fill: { sortBy: { time: 1 }, output: { price: { method: 'linear' } } } },
  ];
}

/**
 * Fill Missing Field Values Based on the Last Observed Value
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/fill/#fill-missing-field-values-based-on-the-last-observed-value}
 */
function test2() {
  type restaurantReviews = {
    date: Date;
    score: number;
  };

  const aggregation: schema.Pipeline<restaurantReviews> = [
    { $fill: { sortBy: { date: 1 }, output: { score: { method: 'locf' } } } },
  ];
}

/**
 * Fill Data for Distinct Partitions
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/fill/#fill-data-for-distinct-partitions}
 */
function test3() {
  type restaurantReviewsMultiple = {
    date: Date;
    restaurant: string;
    score: number;
  };

  const aggregation: schema.Pipeline<restaurantReviewsMultiple> = [
    {
      $fill: {
        sortBy: { date: 1 },
        partitionBy: { restaurant: '$restaurant' },
        output: { score: { method: 'locf' } },
      },
    },
  ];
}

/**
 * Indicate if a Field was Populated Using $fill
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/fill/#indicate-if-a-field-was-populated-using--fill}
 */
function test4() {
  type restaurantReviews = {
    date: Date;
    score: number;
  };

  const aggregation: schema.Pipeline<restaurantReviews> = [
    {
      $set: {
        valueExisted: {
          $ifNull: [{ $toBool: { $toString: '$score' } }, false],
        },
      },
    },
    { $fill: { sortBy: { date: 1 }, output: { score: { method: 'locf' } } } },
  ];
}
