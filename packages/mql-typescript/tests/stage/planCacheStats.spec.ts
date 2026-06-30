/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Return Information for All Entries in the Query Cache
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/planCacheStats/#return-information-for-all-entries-in-the-query-cache}
 */
function test0() {
  type orders = {
    _id: number;
    item: string;
    price: bson.Decimal128;
    quantity: number;
    type: string;
  };

  const aggregation: schema.Pipeline<orders> = [{ $planCacheStats: {} }];
}

/**
 * Find Cache Entry Details for a Query Hash
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/planCacheStats/#find-cache-entry-details-for-a-query-hash}
 */
function test1() {
  type orders = {
    _id: number;
    item: string;
    price: bson.Decimal128;
    quantity: number;
    type: string;
  };

  const aggregation: schema.Pipeline<orders> = [
    { $planCacheStats: {} },

    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' ($planCacheStats emits new fields that are not available statically).
     */
    { $match: { planCacheKey: 'B1435201' } } as any,
  ];
}
