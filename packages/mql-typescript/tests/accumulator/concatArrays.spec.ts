/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Warehouse collection
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/concatArrays/#example}
 */
function test0() {
  type warehouses = {
    instock: Array<string>;
    ordered: Array<string>;
  };

  const aggregation: schema.Pipeline<warehouses> = [
    { $project: { items: { $concatArrays: ['$instock', '$ordered'] } } },
  ];
}
