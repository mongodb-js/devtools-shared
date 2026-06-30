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
  type TestCollection = {
    title: string;
    tomatoes: {
      viewer: {
        rating: number;
      };
    };
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    { $match: { $expr: { $gt: ['$spent', '$budget'] } } },
  ];
}

/**
 * Using $expr With Conditional Statements
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/expr/#using--expr-with-conditional-statements}
 */
function test1() {
  // TODO: no schema found for expr.Using $expr With Conditional Statements: // TODO: No schema found in docs
}
