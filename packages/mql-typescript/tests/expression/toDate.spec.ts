/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/toDate/#example}
 */
function test0() {
  type orders = {
    _id: number;
    item: string;
    qty: number;
    price: number;
    order_date: Date | string;
  };

  const aggregation: schema.Pipeline<orders> = [
    { $addFields: { convertedDate: { $toDate: '$order_date' } } },
    { $sort: { convertedDate: 1 } },
  ];
}
