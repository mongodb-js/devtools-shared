/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Equality Match
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/match/#equality-match}
 */
function test0() {
  type TestCollection = {
    _id: bson.ObjectId;
    author: string;
    score: number;
    views: number;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    { $match: { author: 'dave' } },
  ];
}

/**
 * Perform a Count
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/match/#perform-a-count}
 */
function test1() {
  type TestCollection = {
    _id: bson.ObjectId;
    author: string;
    score: number;
    views: number;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    {
      $match: {
        $or: [{ score: { $gt: 70, $lt: 90 } }, { views: { $gte: 1000 } }],
      },
    },
    { $group: { _id: null, count: { $sum: 1 } } },
  ];
}
