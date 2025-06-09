/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Use in $project Stage
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/stdDevPop/#use-in--project-stage}
 */
function test0() {
  type quizzes = {
    _id: number;
    scores: Array<{
      name: string;
      score: number;
      quiz: number;
    }>;
  };

  const aggregation: schema.Pipeline<quizzes> = [
    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (this test accesses nested fields, which is not currently supported).
     */
    { $project: { stdDev: { $stdDevPop: ['$scores.score'] } } } as any,
  ];
}
