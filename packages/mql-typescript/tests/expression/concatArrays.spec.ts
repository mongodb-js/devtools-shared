import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/concatArrays/#example}
 */
function test0() {
  type warehouses = {
    _id: number;
    instock: Array<string>;
    ordered: Array<string>;
  };

  const aggregation: schema.Pipeline<warehouses> = [
    { $project: { items: { $concatArrays: ['$instock', '$ordered'] } } },
  ];
}
