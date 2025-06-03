import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Find the Three Lowest Scores
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/bottomN/#find-the-three-lowest-scores}
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
        playerId: {
          $bottomN: {
            output: ['$playerId', '$score'],
            sortBy: { score: -1 },
            n: 3,
          },
        },
      },
    },
  ];
}

/**
 * Finding the Three Lowest Score Documents Across Multiple Games
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/bottomN/#finding-the-three-lowest-score-documents-across-multiple-games}
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
        playerId: {
          $bottomN: {
            output: ['$playerId', '$score'],
            sortBy: { score: -1 },
            n: 3,
          },
        },
      },
    },
  ];
}

/**
 * Computing n Based on the Group Key for $group
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/bottomN/#computing-n-based-on-the-group-key-for--group}
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
          $bottomN: {
            output: '$score',
            n: { $cond: { if: { $eq: ['$gameId', 'G2'] }, then: 1, else: 3 } },
            sortBy: { score: -1 },
          },
        },
      },
    },
  ];
}
