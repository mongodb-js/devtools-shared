import * as schema from '../../out/schema';

/**
 * Find the Bottom Score
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/bottom/#find-the-bottom-score}
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
          $bottom: { output: ['$playerId', '$score'], sortBy: { score: -1 } },
        },
      },
    },
  ];
}

/**
 * Finding the Bottom Score Across Multiple Games
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/bottom/#finding-the-bottom-score-across-multiple-games}
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
          $bottom: { output: ['$playerId', '$score'], sortBy: { score: -1 } },
        },
      },
    },
  ];
}
