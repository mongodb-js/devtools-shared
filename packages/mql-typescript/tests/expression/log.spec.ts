/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/log/#example}
 */
function test0() {
  type integers = {
    _id: number;
    int: number;
  };

  const aggregation: schema.Pipeline<integers> = [
    {
      $project: {
        bitsNeeded: { $floor: { $add: [1, { $log: ['$int', 2] }] } },
      },
    },
  ];
}
