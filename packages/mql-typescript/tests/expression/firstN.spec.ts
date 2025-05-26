import * as schema from '../../out/schema';

import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/firstN/#example}
 */
function test0() {
  type games = {
    playerId: number;
    score: Array<number | null | string | bson.Long>;
  };

  const aggregation: schema.Pipeline<games> = [
    { $addFields: { firstScores: { $firstN: { n: 3, input: '$score' } } } },
  ];
}

/**
 * Using $firstN as an Aggregation Expression
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/firstN/#using--firstn-as-an-aggregation-expression}
 */
function test1() {
  type TestCollection = {
    array: Array<number>;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    { $documents: [{ array: [10, 20, 30, 40] }] },
    {
      $project: { firstThreeElements: { $firstN: { input: '$array', n: 3 } } },
    },
  ];
}
