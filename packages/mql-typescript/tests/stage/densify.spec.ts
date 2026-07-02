/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Densify Time Series Data
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/densify/#densify-time-series-data}
 */
function test0() {
  type weather = {
    metadata: {
      sensorId: number;
      type: string;
    };
    timestamp: Date;
    temp: number;
  };

  const aggregation: schema.Pipeline<weather> = [
    {
      $densify: {
        field: 'timestamp',
        range: {
          step: 1,
          unit: 'hour',
          bounds: [
            new Date('2021-05-18T00:00:00.000Z'),
            new Date('2021-05-18T08:00:00.000Z'),
          ],
        },
      },
    },
  ];
}

/**
 * Densifiction with Partitions
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/densify/#densifiction-with-partitions}
 */
function test1() {
  // TODO: no schema found for densify.Densifiction with Partitions: // TODO: No schema found in docs
}
