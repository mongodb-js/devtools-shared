import * as schema from '../../out/schema';

/**
 * Fill Missing Values with Linear Interpolation
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/linearFill/#fill-missing-values-with-linear-interpolation}
 */
function test0() {
  type stock = {
    time: Date;
    price: number;
  };

  const aggregation: schema.Pipeline<stock> = [
    {
      $setWindowFields: {
        sortBy: { time: 1 },
        output: { price: { $linearFill: '$price' } },
      },
    },
  ];
}

/**
 * Use Multiple Fill Methods in a Single Stage
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/linearFill/#use-multiple-fill-methods-in-a-single-stage}
 */
function test1() {
  type stock = {
    time: Date;
    price: number;
  };

  const aggregation: schema.Pipeline<stock> = [
    {
      $setWindowFields: {
        sortBy: { time: 1 },
        output: {
          linearFillPrice: { $linearFill: '$price' },
          locfPrice: { $locf: '$price' },
        },
      },
    },
  ];
}
