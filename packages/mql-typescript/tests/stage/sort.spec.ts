/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Ascending Descending Sort
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/sort/#ascending-descending-sort}
 */
function test0() {
  type users = {
    age: bson.Int32 | number;
    posts: bson.Int32 | number;
    name: string;
  };

  const aggregation: schema.Pipeline<users> = [
    { $sort: { age: -1, posts: 1 } },
  ];
}

/**
 * Text Score Metadata Sort
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/sort/#text-score-metadata-sort}
 */
function test1() {
  type users = {
    age: bson.Int32 | number;
    posts: bson.Int32 | number;
    name: string;
  };

  const aggregation: schema.Pipeline<users> = [
    { $match: { $text: { $search: 'operating' } } },
    { $sort: { score: { $meta: 'textScore' }, posts: -1 } },
  ];
}
