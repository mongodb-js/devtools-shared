/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Output to Same Database
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/out/#output-to-same-database}
 */
function test0() {
  // TODO: no schema found for out.Output to Same Database
}

/**
 * Output to a Different Database
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/out/#output-to-a-different-database}
 */
function test1() {
  // TODO: no schema found for out.Output to a Different Database
}

/**
 * Output to a Time Series Collection
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/out/#output-to-a-time-series-collection}
 */
function test2() {
  type sensors = {
    timestamp: Date;
    sensorId: string;
    temperature: number;
  };

  const aggregation: schema.Pipeline<sensors> = [
    {
      $out: {
        db: 'reporting',
        coll: 'sensorData',
        timeseries: {
          timeField: 'timestamp',
          metaField: 'sensorId',
          granularity: 'hours',
        },
      },
    },
  ];
}
