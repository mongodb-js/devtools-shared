import * as schema from '../../out/schema';

/**
 * Fill Missing Values with the Last Observed Value
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/locf/#fill-missing-values-with-the-last-observed-value}
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
        output: { price: { $locf: '$price' } },
      },
    },
  ];
}
