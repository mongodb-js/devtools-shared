/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Equals a Specified Value
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/eq/#equals-a-specified-value}
 */
function test0() {
  type inventory = {
    _id: number;
    item: {
      name: string;
      code: string;
    };
    qty: number;
    tags: Array<string | Array<string>>;
  };

  const aggregation: schema.Pipeline<inventory> = [
    { $match: { qty: { $eq: 20 } } },
  ];
}

/**
 * Field in Embedded Document Equals a Value
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/eq/#field-in-embedded-document-equals-a-value}
 */
function test1() {
  type inventory = {
    _id: number;
    item: {
      name: string;
      code: string;
    };
    qty: number;
    tags: Array<string | Array<string>>;
  };

  const aggregation: schema.Pipeline<inventory> = [
    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (this test accesses nested fields, which is not currently supported).
     */
    { $match: { 'item.name': { $eq: 'ab' } } } as any,
  ];
}

/**
 * Equals an Array Value
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/eq/#equals-an-array-value}
 */
function test2() {
  type inventory = {
    _id: number;
    item: {
      name: string;
      code: string;
    };
    qty: number;
    tags: Array<string | Array<string>>;
  };

  const aggregation: schema.Pipeline<inventory> = [
    { $match: { tags: { $eq: ['A', 'B'] } } },
  ];
}

/**
 * Regex Match Behaviour
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/eq/#regex-match-behaviour}
 */
function test3() {
  type companies = {
    _id: bson.Int32 | number;
    company: string;
  };

  const aggregation: schema.Pipeline<companies> = [
    { $match: { company: 'MongoDB' } },
    { $match: { company: { $eq: 'MongoDB' } } },
    { $match: { company: new bson.BSONRegExp('^MongoDB', '') } },
    { $match: { company: { $eq: new bson.BSONRegExp('^MongoDB', '') } } },
  ];
}
