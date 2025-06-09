/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/log10/#example}
 */
function test0() {
  type samples = {
    _id: number;
    H3O: number;
  };

  const aggregation: schema.Pipeline<samples> = [
    { $project: { pH: { $multiply: [-1, { $log10: '$H3O' }] } } },
  ];
}
