import * as schema from '../../out/schema';

import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/isArray/#example}
 */
function test0() {
  type warehouses = {
    _id: number;
    instock: Array<string>;
    ordered: Array<string>;
  };

  const aggregation: schema.Pipeline<warehouses> = [
    {
      $project: {
        items: {
          $cond: {
            if: {
              $and: [{ $isArray: ['$instock'] }, { $isArray: ['$ordered'] }],
            },
            then: { $concatArrays: ['$instock', '$ordered'] },
            else: 'One or more fields is not an array.',
          },
        },
      },
    },
  ];
}
