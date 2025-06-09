/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Exists and Not Equal To
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/exists/#exists-and-not-equal-to}
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
    { $match: { qty: { $exists: true, $nin: [5, 15] } } },
  ];
}

/**
 * Null Values
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/exists/#null-values}
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
    { $match: { qty: { $exists: true } } },
  ];
}
