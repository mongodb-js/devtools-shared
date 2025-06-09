/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexOfBytes/#examples}
 */
function test0() {
  type inventory = {
    _id: number;
    item: string | null;
    amount: number;
  };

  const aggregation: schema.Pipeline<inventory> = [
    { $project: { byteLocation: { $indexOfBytes: ['$item', 'foo'] } } },
  ];
}
