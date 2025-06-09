/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * latencyStats Document
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/collStats/#latencystats-document}
 */
function test0() {
  type TestCollection = {
    _id: bson.ObjectId;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    { $collStats: { latencyStats: { histograms: true } } },
  ];
}

/**
 * storageStats Document
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/collStats/#storagestats-document}
 */
function test1() {
  type TestCollection = {
    _id: bson.ObjectId;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    { $collStats: { storageStats: {} } },
  ];
}

/**
 * count Field
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/collStats/#count-field}
 */
function test2() {
  type TestCollection = {
    _id: bson.ObjectId;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    { $collStats: { count: {} } },
  ];
}

/**
 * queryExecStats Document
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/collStats/#queryexecstats-document}
 */
function test3() {
  type TestCollection = {
    _id: bson.ObjectId;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    { $collStats: { queryExecStats: {} } },
  ];
}
