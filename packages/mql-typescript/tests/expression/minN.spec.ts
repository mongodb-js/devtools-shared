/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/minN-array-element/#example}
 */
function test0() {
  type scores = {
    playerId: number;
    score: Array<number | null | string>;
  };

  const aggregation: schema.Pipeline<scores> = [
    { $addFields: { minScores: { $minN: { n: 2, input: '$score' } } } },
  ];
}
