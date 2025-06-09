/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/split/#example}
 */
function test0() {
  type deliveries = {
    _id: number;
    city: string;
    qty: number;
  };

  const aggregation: schema.Pipeline<deliveries> = [
    { $project: { city_state: { $split: ['$city', ', '] }, qty: 1 } },

    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (it may involve a projected field).
     */
    { $unwind: { path: '$city_state' } } as any,

    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (it may involve a projected field).
     */
    { $match: { city_state: { pattern: '[A-Z]{2}', options: '' } } } as any,

    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (it may involve a projected field).
     */
    {
      $group: { _id: { state: '$city_state' }, total_qty: { $sum: '$qty' } },
    } as any,

    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (it may involve a projected field).
     */
    { $sort: { total_qty: -1 } } as any,
  ];
}
