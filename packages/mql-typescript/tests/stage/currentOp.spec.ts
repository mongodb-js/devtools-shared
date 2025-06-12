/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Inactive Sessions
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/currentOp/#inactive-sessions}
 */
function test0() {
  type TestCollection = {
    _id: bson.ObjectId;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    { $currentOp: { allUsers: true, idleSessions: true } },

    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' ($currentOp emits new fields that are not available statically).
     */
    { $match: { active: false, transaction: { $exists: true } } } as any,
  ];
}

/**
 * Sampled Queries
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/currentOp/#sampled-queries}
 */
function test1() {
  type TestCollection = {
    _id: bson.ObjectId;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    { $currentOp: { allUsers: true, localOps: true } },

    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' ($currentOp emits new fields that are not available statically).
     */
    { $match: { desc: 'query analyzer' } } as any,
  ];
}
