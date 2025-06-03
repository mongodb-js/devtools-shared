import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Find the Minimum Three Scores for a Single Game
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/minN/#find-the-minimum-three-scores-for-a-single-game}
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
        minScores: { $minN: { input: ['$score', '$playerId'], n: 3 } },
      },
    },
  ];
}

/**
 * Finding the Minimum Three Documents Across Multiple Games
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/minN/#finding-the-minimum-three-documents-across-multiple-games}
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
        minScores: { $minN: { input: ['$score', '$playerId'], n: 3 } },
      },
    },
  ];
}

/**
 * Computing n Based on the Group Key for $group
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/minN/#computing-n-based-on-the-group-key-for--group}
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
          $minN: {
            input: ['$score', '$playerId'],
            n: { $cond: { if: { $eq: ['$gameId', 'G2'] }, then: 1, else: 3 } },
          },
        },
      },
    },
  ];
}
