/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Count the Number of Documents in a Collection
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/#count-the-number-of-documents-in-a-collection}
 */
function test0() {
  type TestCollection = {
    _id: null;
    count: number;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    { $group: { _id: null, count: { $count: {} } } },
  ];
}

/**
 * Retrieve Distinct Values
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/#retrieve-distinct-values}
 */
function test1() {
  type TestCollection = {
    _id: null;
    count: number;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    { $group: { _id: '$item' } },
  ];
}

/**
 * Group by Item Having
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/#group-by-item-having}
 */
function test2() {
  // TODO: no schema found for group.Group by Item Having: // TODO: No schema found in docs
}

/**
 * Calculate Count Sum and Average
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/#calculate-count--sum--and-average}
 */
function test3() {
  type sales = {
    _id: bson.Int32 | number;
    item: string;
    price: bson.Decimal128;
    quantity: bson.Int32 | number;
    date: Date;
  };

  const aggregation: schema.Pipeline<sales> = [
    {
      $match: {
        date: {
          $gte: new Date('2014-01-01T00:00:00.000Z'),
          $lt: new Date('2015-01-01T00:00:00.000Z'),
        },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        totalSaleAmount: { $sum: { $multiply: ['$price', '$quantity'] } },
        averageQuantity: { $avg: '$quantity' },
        count: { $sum: 1 },
      },
    },
    { $sort: { totalSaleAmount: -1 } },
  ];
}

/**
 * Group by null
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/#group-by-null}
 */
function test4() {
  type sales = {
    _id: bson.Int32 | number;
    item: string;
    price: bson.Decimal128;
    quantity: bson.Int32 | number;
    date: Date;
  };

  const aggregation: schema.Pipeline<sales> = [
    {
      $group: {
        _id: null,
        totalSaleAmount: { $sum: { $multiply: ['$price', '$quantity'] } },
        averageQuantity: { $avg: '$quantity' },
        count: { $sum: 1 },
      },
    },
  ];
}

/**
 * Pivot Data
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/#pivot-data}
 */
function test5() {
  type TestCollection = {
    _id: null;
    count: number;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    { $group: { _id: '$author', books: { $push: '$title' } } },
  ];
}

/**
 * Group Documents by author
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/#group-documents-by-author}
 */
function test6() {
  // TODO: no schema found for group.Group Documents by author: // TODO: No schema found in docs
}
