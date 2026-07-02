/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/bottom-array-operator/#example}
 */
function test0() {
  type games = {
    results: Array<{
      playerId: string;
      score: number;
    }>;
  };

  const aggregation: schema.Pipeline<games> = [
    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (this test accesses nested fields, which is not currently supported).
     */
    {
      $project: {
        bottomScore: {
          $bottom: {
            sortBy: { score: -1 },
            output: ['$playerId', '$score'],
            input: '$results',
          },
        },
      },
    } as any,
  ];
}
