/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * List All Sessions
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/listSessions/#list-all-sessions}
 */
function test0() {
  type TestCollection = {
    _id: bson.ObjectId;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    { $listSessions: { allUsers: true } },
  ];
}

/**
 * List All Sessions for the Specified Users
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/listSessions/#list-all-sessions-for-the-specified-users}
 */
function test1() {
  type TestCollection = {
    _id: bson.ObjectId;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    { $listSessions: { users: [{ user: 'myAppReader', db: 'test' }] } },
  ];
}

/**
 * List All Sessions for the Current User
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/listSessions/#list-all-sessions-for-the-current-user}
 */
function test2() {
  type TestCollection = {
    _id: bson.ObjectId;
  };

  const aggregation: schema.Pipeline<TestCollection> = [{ $listSessions: {} }];
}
