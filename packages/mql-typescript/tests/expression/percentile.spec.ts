/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Use $percentile in a $project Stage
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/percentile/#use-operatorname-in-a--project-stage}
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
        testPercentiles: {
          $percentile: {
            input: ['$test01', '$test02', '$test03'],
            p: [0.5, 0.95],
            method: 'approximate',
          },
        },
      },
    },
  ];
}
