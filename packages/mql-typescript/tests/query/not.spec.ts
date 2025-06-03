import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Syntax
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/not/#syntax}
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
    { $match: { price: { $not: { $gt: 1.99 } } } },
  ];
}

/**
 * Regular Expressions
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/not/#regular-expressions}
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
    { $match: { price: { $not: { pattern: '^p.*', options: '' } } } },
  ];
}
