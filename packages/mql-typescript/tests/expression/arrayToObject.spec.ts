import * as schema from '../../out/schema';

import * as bson from 'bson';

/**
 * $arrayToObject Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/arrayToObject/#-arraytoobject--example}
 */
function test0() {
  type inventory = {
    _id: number;
    item: string;
    dimensions: Array<
      | Array<string | number>
      | {
          k: string;
          v: number | string;
        }
    >;
  };

  const aggregation: schema.Pipeline<inventory> = [
    { $project: { item: 1, dimensions: { $arrayToObject: ['$dimensions'] } } },
  ];
}

/**
 * $objectToArray and $arrayToObject Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/arrayToObject/#-objecttoarray----arraytoobject-example}
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
    { $addFields: { instock: { $objectToArray: '$instock' } } },

    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (it may involve a projected field).
     */
    {
      $addFields: {
        instock: {
          $concatArrays: [
            '$instock',
            [{ k: 'total', v: { $sum: ['$instock.v'] } }],
          ],
        },
      },
    } as any,

    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (it may involve a projected field).
     */
    { $addFields: { instock: { $arrayToObject: ['$instock'] } } } as any,
  ];
}
