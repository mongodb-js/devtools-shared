/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Compare Two Fields from A Single Document
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/expr/#compare-two-fields-from-a-single-document}
 */
function test0() {
  type monthlyBudget = {
    _id: number;
    category: string;
    budget: number;
    spent: number;
  };

  const aggregation: schema.Pipeline<monthlyBudget> = [
    { $match: { $expr: { $gt: ['$spent', '$budget'] } } },
  ];
}

/**
 * Using $expr With Conditional Statements
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/expr/#use--expr-with-conditional-statements}
 */
function test1() {
  type supplies = {
    _id: number;
    item: string;
    qty: bson.Int32 | number;
    price: bson.Decimal128;
  };

  const aggregation: schema.Pipeline<supplies> = [
    {
      $match: {
        $expr: {
          $lt: [
            {
              $cond: {
                if: { $gte: ['$qty', 100] },
                then: { $multiply: ['$price', 0.5] },
                else: { $multiply: ['$price', 0.75] },
              },
            },
            5,
          ],
        },
      },
    },
  ];
}
