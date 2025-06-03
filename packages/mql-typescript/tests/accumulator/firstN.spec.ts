import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Null and Missing Values
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/firstN/#null-and-missing-values}
 */
function test0() {
  type TestCollection = {
    playerId: string;
    gameId: string;
    score: number | null;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    {
      $documents: [
        { playerId: 'PlayerA', gameId: 'G1', score: 1 },
        { playerId: 'PlayerB', gameId: 'G1', score: 2 },
        { playerId: 'PlayerC', gameId: 'G1', score: 3 },
        { playerId: 'PlayerD', gameId: 'G1' },
        { playerId: 'PlayerE', gameId: 'G1', score: null },
      ],
    },
    {
      $group: {
        _id: '$gameId',
        firstFiveScores: { $firstN: { input: '$score', n: 5 } },
      },
    },
  ];
}

/**
 * Find the First Three Player Scores for a Single Game
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/firstN/#find-the-first-three-player-scores-for-a-single-game}
 */
function test1() {
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
        firstThreeScores: { $firstN: { input: ['$playerId', '$score'], n: 3 } },
      },
    },
  ];
}

/**
 * Finding the First Three Player Scores Across Multiple Games
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/firstN/#finding-the-first-three-player-scores-across-multiple-games}
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
        _id: '$gameId',
        playerId: { $firstN: { input: ['$playerId', '$score'], n: 3 } },
      },
    },
  ];
}

/**
 * Using $sort With $firstN
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/firstN/#using--sort-with--firstn}
 */
function test3() {
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
        playerId: { $firstN: { input: ['$playerId', '$score'], n: 3 } },
      },
    },
  ];
}

/**
 * Computing n Based on the Group Key for $group
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/firstN/#computing-n-based-on-the-group-key-for--group}
 */
function test4() {
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
          $firstN: {
            input: '$score',
            n: { $cond: { if: { $eq: ['$gameId', 'G2'] }, then: 1, else: 3 } },
          },
        },
      },
    },
  ];
}
