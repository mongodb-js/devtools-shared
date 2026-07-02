/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Hash a Field Value
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/hash/#hash-a-field-value}
 */
function test0() {
  type files = {
    _id: number;
    filename: string;
    hash: bson.Binary;
  };

  const aggregation: schema.Pipeline<files> = [
    {
      $project: {
        filename: 1,
        hash: { $hash: { input: '$filename', algorithm: 'sha256' } },
      },
    },
  ];
}

/**
 * Hash a Literal String
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/hash/#hash-a-literal-string}
 */
function test1() {
  type TestCollection = {
    val: string;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    { $documents: [{ val: 'hello' }] },
    {
      $project: {
        _id: 0,
        hash: { $hash: { input: '$val', algorithm: 'xxh64' } },
      },
    },
  ];
}

/**
 * Hash BinData
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/hash/#hash-bindata}
 */
function test2() {
  type binaries = {
    _id: number;
    data: bson.Binary;
  };

  const aggregation: schema.Pipeline<binaries> = [
    { $project: { hash: { $hash: { input: '$data', algorithm: 'sha256' } } } },
  ];
}

/**
 * Null or Missing Input
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/hash/#null-or-missing-input}
 */
function test3() {
  type TestCollection = {
    val: null;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    { $documents: [{ val: null }, {}] },
    { $project: { hash: { $hash: { input: '$val', algorithm: 'sha256' } } } },
  ];
}
