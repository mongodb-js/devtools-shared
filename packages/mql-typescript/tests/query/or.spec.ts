/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * $or Clauses
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/or/#-or-clauses-and-indexes}
 */
function test0() {
  type inventory = {
    price: bson.Double | number;
    qty: bson.Int32 | number | undefined;
    quantity: bson.Int32 | number | undefined;
    sale: boolean;
    tags: Array<string>;
  };

  const aggregation: schema.Pipeline<inventory> = [
    { $match: { $or: [{ quantity: { $lt: 20 } }, { price: 10 }] } },
  ];
}

/**
 * Error Handling
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/or/#error-handling}
 */
function test1() {
  type example = {
    x: bson.Int32 | number;
  };

  const aggregation: schema.Pipeline<example> = [
    {
      $match: {
        $or: [
          { x: { $eq: 0 } },
          { $expr: { $eq: [{ $divide: [1, '$x'] }, 3] } },
        ],
      },
    },
  ];
}
