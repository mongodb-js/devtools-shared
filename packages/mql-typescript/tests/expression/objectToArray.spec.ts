import * as schema from '../../out/schema';

import * as bson from 'bson';

/**
 * $objectToArray Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/objectToArray/#-objecttoarray-example}
 */
function test0() {
  type inventory = {
    _id: number;
    item: string;
    dimensions: {
      l: number;
      w: number;
      uom: string;
    };
  };

  const aggregation: schema.Pipeline<inventory> = [
    { $project: { item: 1, dimensions: { $objectToArray: '$dimensions' } } },
  ];
}

/**
 * $objectToArray to Sum Nested Fields
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/objectToArray/#-objecttoarray-to-sum-nested-fields}
 */
function test1() {
  type inventory = {
    _id: number;
    item: string;
    instock: {
      warehouse1: number;
      warehouse2: number;
      warehouse3: number;
    };
  };

  const aggregation: schema.Pipeline<inventory> = [
    { $project: { warehouses: { $objectToArray: '$instock' } } },

    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (it may involve a projected field).
     */
    { $unwind: { path: '$warehouses' } } as any,

    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (it may involve a projected field).
     */
    {
      $group: { _id: '$warehouses.k', total: { $sum: '$warehouses.v' } },
    } as any,
  ];
}
