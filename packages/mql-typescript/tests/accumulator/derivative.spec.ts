import * as schema from '../../out/schema';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/derivative/#example}
 */
function test0() {
  type deliveryFleet = {
    truckID: string;
    timeStamp: Date;
    miles: number;
  };

  const aggregation: schema.Pipeline<deliveryFleet> = [
    {
      $setWindowFields: {
        partitionBy: '$truckID',
        sortBy: { timeStamp: 1 },
        output: {
          truckAverageSpeed: {
            $derivative: { input: '$miles', unit: 'hour' },
            window: { range: [-30, 0], unit: 'second' },
          },
        },
      },
    },

    /**
     * This stage is unsupported by the static type system (it may involve a projection), so we're casting it to 'any'.
     */
    { $match: { truckAverageSpeed: { $gt: 50 } } } as any,
  ];
}
