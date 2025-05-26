import * as schema from '../../out/schema';

import * as bson from 'bson';

/**
 * Use in $project Stage
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/sum/#use-in--project-stage}
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
        quizTotal: { $sum: ['$quizzes'] },
        labTotal: { $sum: ['$labs'] },
        examTotal: { $sum: ['$final', '$midterm'] },
      },
    },
  ];
}
