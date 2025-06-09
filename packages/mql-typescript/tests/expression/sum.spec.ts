/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Use in $project Stage
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/sum/#use-in--project-stage}
 */
function test0() {
  type students = {
    _id: number;
    quizzes: Array<number>;
    labs: Array<number>;
    final: number;
    midterm: number;
  };

  const aggregation: schema.Pipeline<students> = [
    {
      $project: {
        quizTotal: { $sum: ['$quizzes'] },
        labTotal: { $sum: ['$labs'] },
        examTotal: { $sum: ['$final', '$midterm'] },
      },
    },
  ];
}
