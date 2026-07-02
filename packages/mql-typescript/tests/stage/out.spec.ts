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
  type books = {
    _id: number;
    title: string;
    author: string;
    copies: number;
  };

  const aggregation: schema.Pipeline<books> = [
    { $group: { _id: '$author', books: { $push: '$title' } } },
    { $out: { coll: 'authors' } },
  ];
}

/**
 * Output to a Different Database
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/out/#output-to-a-different-database}
 */
function test1() {
  type books = {
    _id: number;
    title: string;
    author: string;
    copies: number;
  };

  const aggregation: schema.Pipeline<books> = [
    { $group: { _id: '$author', books: { $push: '$title' } } },
    { $out: { db: 'reporting', coll: 'authors' } },
  ];
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
