/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * $mergeObjects
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/mergeObjects/#-mergeobjects}
 */
function test0() {
  type orders = {
    _id: number;
    item: string;
    price: number;
    ordered: number;
  };

  const aggregation: schema.Pipeline<orders> = [
    {
      $lookup: {
        from: 'items',
        localField: 'item',
        foreignField: 'item',
        as: 'fromItems',
      },
    },
    {
      $replaceRoot: {
        newRoot: {
          $mergeObjects: [{ $arrayElemAt: ['$fromItems', 0] }, '$$ROOT'],
        },
      },
    },
    { $project: { fromItems: 0 } },
  ];
}
