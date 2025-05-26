import * as schema from '../../out/schema';

/**
 * Find the Top Score
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/top/#find-the-top-score}
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
          $top: { output: ['$playerId', '$score'], sortBy: { score: -1 } },
        },
      },
    },
  ];
}

/**
 * Find the Top Score Across Multiple Games
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/top/#find-the-top-score-across-multiple-games}
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
          $top: { output: ['$playerId', '$score'], sortBy: { score: -1 } },
        },
      },
    },
  ];
}
