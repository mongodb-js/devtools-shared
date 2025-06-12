/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Perform a Single Equality Join with $lookup
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/#perform-a-single-equality-join-with--lookup}
 */
function test0() {
  type orders = {
    _id: number;
    item: string;
    price: number;
    quantity: number;
  };

  const aggregation: schema.Pipeline<orders> = [
    {
      $lookup: {
        from: 'inventory',
        localField: 'item',
        foreignField: 'sku',
        as: 'inventory_docs',
      },
    },
  ];
}

/**
 * Use $lookup with an Array
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/#use--lookup-with-an-array}
 */
function test1() {
  type classes = {
    _id: number;
    title: string;
    enrollmentlist: Array<string>;
    days: Array<string>;
  };

  const aggregation: schema.Pipeline<classes> = [
    {
      $lookup: {
        from: 'members',
        localField: 'enrollmentlist',
        foreignField: 'name',
        as: 'enrollee_info',
      },
    },
  ];
}

/**
 * Use $lookup with $mergeObjects
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/#use--lookup-with--mergeobjects}
 */
function test2() {
  type orders = {
    _id: number;
    item: string;
    price: number;
    quantity: number;
  };

  const aggregation: schema.Pipeline<orders> = [
    {
      $lookup: {
        from: 'items',
        localField: 'item',
        foreignField: 'item',
        as: 'fromItems',
      },
    },
    {
      $replaceRoot: {
        newRoot: {
          $mergeObjects: [{ $arrayElemAt: ['$fromItems', 0] }, '$$ROOT'],
        },
      },
    },
    { $project: { fromItems: 0 } },
  ];
}

/**
 * Perform Multiple Joins and a Correlated Subquery with $lookup
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/#perform-multiple-joins-and-a-correlated-subquery-with--lookup}
 */
function test3() {
  // TODO: no schema found for lookup.Perform Multiple Joins and a Correlated Subquery with $lookup: // TODO: No schema found in docs
}

/**
 * Perform an Uncorrelated Subquery with $lookup
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/#perform-an-uncorrelated-subquery-with--lookup}
 */
function test4() {
  type absences = {
    _id: number;
    student: string;
    sickdays: Array<Date>;
  };

  const aggregation: schema.Pipeline<absences> = [
    {
      $lookup: {
        from: 'holidays',
        pipeline: [
          { $match: { year: 2018 } },
          { $project: { _id: 0, date: { name: '$name', date: '$date' } } },
          { $replaceRoot: { newRoot: '$date' } },
        ],
        as: 'holidays',
      },
    },
  ];
}

/**
 * Perform a Concise Correlated Subquery with $lookup
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/#perform-a-concise-correlated-subquery-with--lookup}
 */
function test5() {
  type restaurants = {
    _id: number;
    name: string;
    food: Array<string>;
    beverages: Array<string>;
  };

  const aggregation: schema.Pipeline<restaurants> = [
    {
      $lookup: {
        from: 'restaurants',
        localField: 'restaurant_name',
        foreignField: 'name',
        let: { orders_drink: '$drink' },
        pipeline: [
          { $match: { $expr: { $in: ['$$orders_drink', '$beverages'] } } },
        ],
        as: 'matches',
      },
    },
  ];
}
