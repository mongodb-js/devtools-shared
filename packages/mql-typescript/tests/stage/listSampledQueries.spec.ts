/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * List Sampled Queries for All Collections
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/listSampledQueries/#list-sampled-queries-for-all-collections}
 */
function test0() {
  type TestCollection = {
    _id: bson.ObjectId;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    { $listSampledQueries: {} },
  ];
}

/**
 * List Sampled Queries for A Specific Collection
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/listSampledQueries/#list-sampled-queries-for-a-specific-collection}
 */
function test1() {
  type TestCollection = {
    _id: bson.ObjectId;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    { $listSampledQueries: { namespace: 'social.post' } },
  ];
}
