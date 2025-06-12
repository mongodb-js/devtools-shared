/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Use the $in Operator to Match Values in an Array
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/in/#use-the--in-operator-to-match-values}
 */
function test0() {
  type inventory = {
    item: string;
    quantity: number;
    tags: Array<string>;
  };

  const aggregation: schema.Pipeline<inventory> = [
    { $match: { tags: { $in: ['home', 'school'] } } },
  ];
}

/**
 * Use the $in Operator with a Regular Expression
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/in/#use-the--in-operator-with-a-regular-expression}
 */
function test1() {
  type inventory = {
    item: string;
    quantity: number;
    tags: Array<string>;
  };

  const aggregation: schema.Pipeline<inventory> = [
    {
      $match: {
        tags: {
          $in: [new bson.BSONRegExp('^be', ''), new bson.BSONRegExp('^st', '')],
        },
      },
    },
  ];
}
