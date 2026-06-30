/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Query with Two Expressions
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/nor/#-nor-query-with-two-expressions}
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
    { $match: { $nor: [{ price: 1.99 }, { sale: true }] } },
  ];
}

/**
 * Additional Comparisons
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/nor/#-nor-and-additional-comparisons}
 */
function test1() {
  type inventory = {
    price: bson.Double | number;
    qty: bson.Int32 | number | undefined;
    quantity: bson.Int32 | number | undefined;
    sale: boolean;
    tags: Array<string>;
  };

  const aggregation: schema.Pipeline<inventory> = [
    {
      $match: { $nor: [{ price: 1.99 }, { qty: { $lt: 20 } }, { sale: true }] },
    },
  ];
}

/**
 * $nor and $exists
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/nor/#-nor-and--exists}
 */
function test2() {
  type inventory = {
    price: bson.Double | number;
    qty: bson.Int32 | number | undefined;
    quantity: bson.Int32 | number | undefined;
    sale: boolean;
    tags: Array<string>;
  };

  const aggregation: schema.Pipeline<inventory> = [
    {
      $match: {
        $nor: [
          { price: 1.99 },
          { price: { $exists: false } },
          { sale: true },
          { sale: { $exists: false } },
        ],
      },
    },
  ];
}
