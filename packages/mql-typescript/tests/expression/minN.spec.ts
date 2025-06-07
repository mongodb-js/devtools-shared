import * as schema from '../../out/schema';
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
