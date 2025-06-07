import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Element Match
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/elemMatch/#element-match}
 */
function test0() {
  type TestCollection = {
    _id: number;
    results: Array<number>;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    { $match: { results: { $elemMatch: { $gte: 80, $lt: 85 } } } },
  ];
}

/**
 * Array of Embedded Documents
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/elemMatch/#array-of-embedded-documents}
 */
function test1() {
  type survey = {
    _id: number;
    results:
      | Array<{
          product: string;
          score: number;
        }>
      | {
          product: string;
          score: number;
        };
  };

  const aggregation: schema.Pipeline<survey> = [
    {
      $match: {
        results: { $elemMatch: { product: 'xyz', score: { $gte: 8 } } },
      },
    },
  ];
}

/**
 * Single Query Condition
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/elemMatch/#single-query-condition}
 */
function test2() {
  type TestCollection = {
    _id: number;
    results: Array<number>;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    { $match: { results: { $elemMatch: { product: { $ne: 'xyz' } } } } },
  ];
}
