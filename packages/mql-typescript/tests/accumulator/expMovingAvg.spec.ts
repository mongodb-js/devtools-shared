import * as schema from '../../out/schema';

/**
 * Exponential Moving Average Using N
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/expMovingAvg/#exponential-moving-average-using-n}
 */
function test0() {
  type stockPrices = {
    stock: string;
    date: Date;
    price: number;
  };

  const aggregation: schema.Pipeline<stockPrices> = [
    {
      $setWindowFields: {
        partitionBy: '$stock',
        sortBy: { date: 1 },
        output: {
          expMovingAvgForStock: { $expMovingAvg: { input: '$price', N: 2 } },
        },
      },
    },
  ];
}

/**
 * Exponential Moving Average Using alpha
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/expMovingAvg/#exponential-moving-average-using-alpha}
 */
function test1() {
  type stockPrices = {
    stock: string;
    date: Date;
    price: number;
  };

  const aggregation: schema.Pipeline<stockPrices> = [
    {
      $setWindowFields: {
        partitionBy: '$stock',
        sortBy: { date: 1 },
        output: {
          expMovingAvgForStock: {
            $expMovingAvg: { input: '$price', alpha: 0.75 },
          },
        },
      },
    },
  ];
}
