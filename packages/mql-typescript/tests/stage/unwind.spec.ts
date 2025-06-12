/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Unwind Array
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/unwind/#unwind-array}
 */
function test0() {
  type inventory = {
    _id: number;
    item: string;
    sizes: Array<string>;
  };

  const aggregation: schema.Pipeline<inventory> = [
    { $unwind: { path: '$sizes' } },
  ];
}

/**
 * preserveNullAndEmptyArrays
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/unwind/#preservenullandemptyarrays}
 */
function test1() {
  type inventory = {
    _id: number;
    item: string;
    sizes: Array<string>;
  };

  const aggregation: schema.Pipeline<inventory> = [
    { $unwind: { path: '$sizes', preserveNullAndEmptyArrays: true } },
  ];
}

/**
 * includeArrayIndex
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/unwind/#includearrayindex}
 */
function test2() {
  type inventory = {
    _id: number;
    item: string;
    sizes: Array<string>;
  };

  const aggregation: schema.Pipeline<inventory> = [
    { $unwind: { path: '$sizes', includeArrayIndex: 'arrayIndex' } },
  ];
}

/**
 * Group by Unwound Values
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/unwind/#group-by-unwound-values}
 */
function test3() {
  type inventory2 = {
    _id: number;
    item: string;
    price: bson.Decimal128;
    sizes: Array<string> | string | null;
  };

  const aggregation: schema.Pipeline<inventory2> = [
    { $unwind: { path: '$sizes', preserveNullAndEmptyArrays: true } },
    { $group: { _id: '$sizes', averagePrice: { $avg: '$price' } } },
    { $sort: { averagePrice: -1 } },
  ];
}

/**
 * Unwind Embedded Arrays
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/unwind/#unwind-embedded-arrays}
 */
function test4() {
  type sales = {
    _id: string;
    items: Array<{
      name: string;
      tags: Array<string>;
      price: bson.Decimal128;
      quantity: bson.Int32 | number;
    }>;
  };

  const aggregation: schema.Pipeline<sales> = [
    { $unwind: { path: '$items' } },

    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (this test accesses nested fields, which is not currently supported).
     */
    { $unwind: { path: '$items.tags' } } as any,

    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (this test accesses nested fields, which is not currently supported).
     */
    {
      $group: {
        _id: '$items.tags',
        totalSalesAmount: {
          $sum: { $multiply: ['$items.price', '$items.quantity'] },
        },
      },
    } as any,
  ];
}
