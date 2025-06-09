/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

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
     * This stage is unsupported by the static type system, so we're casting it to 'any' (it may involve a projected field).
     */
    { $match: { truckAverageSpeed: { $gt: 50 } } } as any,
  ];
}
