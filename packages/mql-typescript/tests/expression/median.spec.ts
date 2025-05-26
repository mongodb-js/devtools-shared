import * as schema from '../../out/schema';

import * as bson from 'bson';

/**
 * Use $median in a $project Stage
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/median/#use-operatorname-in-a--project-stage}
 */
function test0() {
  type testScores = {
    studentId: string;
    test01: number;
    test02: number;
    test03: number;
  };

  const aggregation: schema.Pipeline<testScores> = [
    {
      $project: {
        _id: 0,
        studentId: 1,
        testMedians: {
          $median: {
            input: ['$test01', '$test02', '$test03'],
            method: 'approximate',
          },
        },
      },
    },
  ];
}
