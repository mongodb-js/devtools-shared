/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/count/#examples}
 */
function test0() {
  type scores = {
    _id: number;
    subject: string;
    score: number;
  };

  const aggregation: schema.Pipeline<scores> = [
    { $match: { score: { $gt: 80 } } },
    { $count: 'passing_scores' },
  ];
}
