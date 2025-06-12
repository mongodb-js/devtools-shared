/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/sample/#examples}
 */
function test0() {
  type users = {
    _id: number;
    name: string;
    q1: boolean;
    q2: boolean;
  };

  const aggregation: schema.Pipeline<users> = [{ $sample: { size: 3 } }];
}
