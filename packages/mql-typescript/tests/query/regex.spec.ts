/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Perform a LIKE Match
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/regex/#perform-a-like-match}
 */
function test0() {
  type products = {
    _id: number;
    sku: string;
    description: string;
  };

  const aggregation: schema.Pipeline<products> = [
    { $match: { sku: { $regex: { pattern: '789$', options: '' } } } },
  ];
}

/**
 * Perform Case-Insensitive Regular Expression Match
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/regex/#perform-case-insensitive-regular-expression-match}
 */
function test1() {
  type products = {
    _id: number;
    sku: string;
    description: string;
  };

  const aggregation: schema.Pipeline<products> = [
    { $match: { sku: { $regex: { pattern: '^ABC', options: 'i' } } } },
  ];
}
