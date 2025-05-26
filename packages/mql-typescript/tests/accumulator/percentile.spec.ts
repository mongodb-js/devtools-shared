import * as schema from '../../out/schema';

/**
 * Calculate a Single Value as an Accumulator
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/percentile/#calculate-a-single-value-as-an-accumulator}
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
        test01_percentiles: {
          $percentile: { input: '$test01', p: [0.95], method: 'approximate' },
        },
      },
    },
  ];
}

/**
 * Calculate Multiple Values as an Accumulator
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/percentile/#calculate-multiple-values-as-an-accumulator}
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
      $group: {
        _id: null,
        test01_percentiles: {
          $percentile: {
            input: '$test01',
            p: [0.5, 0.75, 0.9, 0.95],
            method: 'approximate',
          },
        },
        test02_percentiles: {
          $percentile: {
            input: '$test02',
            p: [0.5, 0.75, 0.9, 0.95],
            method: 'approximate',
          },
        },
        test03_percentiles: {
          $percentile: {
            input: '$test03',
            p: [0.5, 0.75, 0.9, 0.95],
            method: 'approximate',
          },
        },
        test03_percent_alt: {
          $percentile: {
            input: '$test03',
            p: [0.9, 0.5, 0.75, 0.95],
            method: 'approximate',
          },
        },
      },
    },
  ];
}

/**
 * Use $percentile in a $setWindowField Stage
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/percentile/#use-operatorname-in-a--setwindowfield-stage}
 */
function test2() {
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
          test01_95percentile: {
            $percentile: { input: '$test01', p: [0.95], method: 'approximate' },
            window: { range: [-3, 3] },
          },
        },
      },
    },
    { $project: { _id: 0, studentId: 1, test01_95percentile: 1 } },
  ];
}
