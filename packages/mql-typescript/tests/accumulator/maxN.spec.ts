import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Find the Maximum Three Scores for a Single Game
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/maxN/#find-the-maximum-three-scores-for-a-single-game}
 */
function test0() {
  type gamescores = {
    playerId: string;
    gameId: string;
    score: number;
  };

  const aggregation: schema.Pipeline<gamescores> = [
    { $match: { gameId: 'G1' } },
    {
      $group: {
        _id: '$gameId',
        maxThreeScores: { $maxN: { input: ['$score', '$playerId'], n: 3 } },
      },
    },
  ];
}

/**
 * Finding the Maximum Three Scores Across Multiple Games
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/maxN/#finding-the-maximum-three-scores-across-multiple-games}
 */
function test1() {
  type gamescores = {
    playerId: string;
    gameId: string;
    score: number;
  };

  const aggregation: schema.Pipeline<gamescores> = [
    {
      $group: {
        _id: '$gameId',
        maxScores: { $maxN: { input: ['$score', '$playerId'], n: 3 } },
      },
    },
  ];
}

/**
 * Computing n Based on the Group Key for $group
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/maxN/#computing-n-based-on-the-group-key-for--group}
 */
function test2() {
  type gamescores = {
    playerId: string;
    gameId: string;
    score: number;
  };

  const aggregation: schema.Pipeline<gamescores> = [
    {
      $group: {
        _id: { gameId: '$gameId' },
        gamescores: {
          $maxN: {
            input: ['$score', '$playerId'],
            n: { $cond: { if: { $eq: ['$gameId', 'G2'] }, then: 1, else: 3 } },
          },
        },
      },
    },
  ];
}
