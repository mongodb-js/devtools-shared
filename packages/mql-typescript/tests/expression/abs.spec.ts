/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/abs/#example}
 */
function test0() {
  type temperatureChange = {
    _id: number;
    startTemp: number;
    endTemp: number;
  };

  const aggregation: schema.Pipeline<temperatureChange> = [
    {
      $project: { delta: { $abs: { $subtract: ['$startTemp', '$endTemp'] } } },
    },
  ];
}
