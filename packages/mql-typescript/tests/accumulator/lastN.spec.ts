import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Find the Last Three Player Scores for a Single Game
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/lastN/#find-the-last-three-player-scores-for-a-single-game}
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
        lastThreeScores: { $lastN: { input: ['$playerId', '$score'], n: 3 } },
      },
    },
  ];
}

/**
 * Finding the Last Three Player Scores Across Multiple Games
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/lastN/#finding-the-last-three-player-scores-across-multiple-games}
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
        playerId: { $lastN: { input: ['$playerId', '$score'], n: 3 } },
      },
    },
  ];
}

/**
 * Using $sort With $lastN
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/lastN/#using--sort-with--lastn}
 */
function test2() {
  type gamescores = {
    playerId: string;
    gameId: string;
    score: number;
  };

  const aggregation: schema.Pipeline<gamescores> = [
    { $sort: { score: -1 } },
    {
      $group: {
        _id: '$gameId',
        playerId: { $lastN: { input: ['$playerId', '$score'], n: 3 } },
      },
    },
  ];
}

/**
 * Computing n Based on the Group Key for $group
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/lastN/#computing-n-based-on-the-group-key-for--group}
 */
function test3() {
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
          $lastN: {
            input: '$score',
            n: { $cond: { if: { $eq: ['$gameId', 'G2'] }, then: 1, else: 3 } },
          },
        },
      },
    },
  ];
}
