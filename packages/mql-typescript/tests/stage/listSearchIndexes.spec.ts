/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Return All Search Indexes
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/listSearchIndexes/#return-all-search-indexes}
 */
function test0() {
  type TestCollection = {
    _id: bson.ObjectId;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    { $listSearchIndexes: {} },
  ];
}

/**
 * Return a Single Search Index by Name
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/listSearchIndexes/#return-a-single-search-index-by-name}
 */
function test1() {
  type TestCollection = {
    _id: bson.ObjectId;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    { $listSearchIndexes: { name: 'synonym-mappings' } },
  ];
}

/**
 * Return a Single Search Index by id
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/listSearchIndexes/#return-a-single-search-index-by-id}
 */
function test2() {
  type TestCollection = {
    _id: bson.ObjectId;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    { $listSearchIndexes: { id: '6524096020da840844a4c4a7' } },
  ];
}
