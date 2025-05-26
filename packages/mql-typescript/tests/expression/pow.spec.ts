import * as schema from '../../out/schema';

import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/pow/#example}
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
    {
      $project: { variance: { $pow: [{ $stdDevPop: ['$scores.score'] }, 2] } },
    } as any,
  ];
}
