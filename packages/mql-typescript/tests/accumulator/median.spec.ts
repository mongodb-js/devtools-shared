import * as schema from '../../out/schema';

/**
 * Use $median as an Accumulator
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/median/#use-operatorname-as-an-accumulator}
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
      $group: {
        _id: null,
        test01_median: { $median: { input: '$test01', method: 'approximate' } },
      },
    },
  ];
}

/**
 * Use $median in a $setWindowField Stage
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/median/#use-operatorname-in-a--setwindowfield-stage}
 */
function test1() {
  type testScores = {
    studentId: string;
    test01: number;
    test02: number;
    test03: number;
  };

  const aggregation: schema.Pipeline<testScores> = [
    {
      $setWindowFields: {
        sortBy: { test01: 1 },
        output: {
          test01_median: {
            $median: { input: '$test01', method: 'approximate' },
            window: { range: [-3, 3] },
          },
        },
      },
    },
    { $project: { _id: 0, studentId: 1, test01_median: 1 } },
  ];
}
