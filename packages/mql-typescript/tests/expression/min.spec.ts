/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Use in $project Stage
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/min/#use-in--project-stage}
 */
function test0() {
  type TestCollection = {
    _id: number;
    quizzes: Array<number>;
    labs: Array<number>;
    final: number;
    midterm: number;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    {
      $project: {
        quizMin: { $min: ['$quizzes'] },
        labMin: { $min: ['$labs'] },
        examMin: { $min: ['$final', '$midterm'] },
      },
    },
  ];
}
