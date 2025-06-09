/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/toDouble/#example}
 */
function test0() {
  type weather = {
    _id: number;
    date: Date;
    temp: string;
  };

  const aggregation: schema.Pipeline<weather> = [
    {
      $addFields: { degrees: { $toDouble: { $substrBytes: ['$temp', 0, 4] } } },
    },
  ];
}
