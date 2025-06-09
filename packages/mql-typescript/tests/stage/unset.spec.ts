/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Remove a Single Field
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/unset/#remove-a-single-field}
 */
function test0() {
  type books = {
    _id: number;
    title: string;
    isbn: string;
    author: {
      last: string;
      first: string;
    };
    copies: Array<{
      warehouse: string;
      qty: number;
    }>;
  };

  const aggregation: schema.Pipeline<books> = [{ $unset: ['copies'] }];
}

/**
 * Remove Top-Level Fields
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/unset/#remove-top-level-fields}
 */
function test1() {
  type books = {
    _id: number;
    title: string;
    isbn: string;
    author: {
      last: string;
      first: string;
    };
    copies: Array<{
      warehouse: string;
      qty: number;
    }>;
  };

  const aggregation: schema.Pipeline<books> = [{ $unset: ['isbn', 'copies'] }];
}

/**
 * Remove Embedded Fields
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/unset/#remove-embedded-fields}
 */
function test2() {
  type books = {
    _id: number;
    title: string;
    isbn: string;
    author: {
      last: string;
      first: string;
    };
    copies: Array<{
      warehouse: string;
      qty: number;
    }>;
  };

  const aggregation: schema.Pipeline<books> = [
    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (this test accesses nested fields, which is not currently supported).
     */
    { $unset: ['isbn', 'author.first', 'copies.warehouse'] } as any,
  ];
}
