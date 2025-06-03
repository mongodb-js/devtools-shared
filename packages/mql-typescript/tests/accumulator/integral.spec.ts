import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/integral/#example}
 */
function test0() {
  type powerConsumption = {
    powerMeterID: string;
    timeStamp: Date;
    kilowatts: number;
  };

  const aggregation: schema.Pipeline<powerConsumption> = [
    {
      $setWindowFields: {
        partitionBy: '$powerMeterID',
        sortBy: { timeStamp: 1 },
        output: {
          powerMeterKilowattHours: {
            $integral: { input: '$kilowatts', unit: 'hour' },
            window: { range: ['unbounded', 'current'], unit: 'hour' },
          },
        },
      },
    },
  ];
}
