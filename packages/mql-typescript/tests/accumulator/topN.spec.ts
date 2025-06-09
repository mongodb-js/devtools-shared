/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Find the Three Highest Scores
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/topN/#find-the-three-highest-scores}
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
          $topN: {
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
 * Finding the Three Highest Score Documents Across Multiple Games
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/topN/#finding-the-three-highest-score-documents-across-multiple-games}
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
          $topN: {
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
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/topN/#computing-n-based-on-the-group-key-for--group}
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
          $topN: {
            output: '$score',
            n: { $cond: { if: { $eq: ['$gameId', 'G2'] }, then: 1, else: 3 } },
            sortBy: { score: -1 },
          },
        },
      },
    },
  ];
}
