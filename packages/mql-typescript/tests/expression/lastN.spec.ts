import * as schema from '../../out/schema';

import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/lastN/#example}
 */
function test0() {
  type games = {
    playerId: number;
    score: Array<number | null | string | bson.Long>;
  };

  const aggregation: schema.Pipeline<games> = [
    { $addFields: { lastScores: { $lastN: { n: 3, input: '$score' } } } },
  ];
}

/**
 * Using $lastN as an Aggregation Expression
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/lastN/#using--lastn-as-an-aggregation-expression}
 */
function test1() {
  type TestCollection = {
    array: Array<number>;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    { $documents: [{ array: [10, 20, 30, 40] }] },
    { $project: { lastThreeElements: { $lastN: { input: '$array', n: 3 } } } },
  ];
}
