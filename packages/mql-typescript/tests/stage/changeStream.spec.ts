/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/changeStream/#examples}
 */
function test0() {
  type names = {
    _id: bson.ObjectId;
  };

  const aggregation: schema.Pipeline<names> = [{ $changeStream: {} }];
}
