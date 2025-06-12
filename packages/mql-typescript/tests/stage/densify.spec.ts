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
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/densify/#densification-with-partitions}
 */
function test1() {
  type coffee = {
    altitude: number;
    variety: string;
    score: number;
    price: number;
  };

  const aggregation: schema.Pipeline<coffee> = [
    {
      $densify: {
        field: 'altitude',
        partitionByFields: ['variety'],
        range: { bounds: 'full', step: 200 },
      },
    },
  ];
}
