import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * AND Queries With Multiple Expressions Specifying the Same Field
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/and/#and-queries-with-multiple-expressions-specifying-the-same-field}
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
    {
      $match: {
        $and: [{ price: { $ne: 1.99 } }, { price: { $exists: true } }],
      },
    },
  ];
}

/**
 * AND Queries With Multiple Expressions Specifying the Same Operator
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/and/#and-queries-with-multiple-expressions-specifying-the-same-operator}
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
      $match: {
        $and: [
          { $or: [{ qty: { $lt: 10 } }, { qty: { $gt: 50 } }] },
          { $or: [{ sale: true }, { price: { $lt: 5 } }] },
        ],
      },
    },
  ];
}
