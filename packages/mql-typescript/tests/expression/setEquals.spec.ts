/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/setEquals/#example}
 */
function test0() {
  type bakeryOrders = {
    _id: number;
    cakes: Array<string>;
    cupcakes: Array<string>;
  };

  const aggregation: schema.Pipeline<bakeryOrders> = [
    {
      $project: {
        _id: 0,
        cakes: 1,
        cupcakes: 1,
        sameFlavors: { $setEquals: ['$cakes', '$cupcakes'] },
      },
    },
  ];
}
