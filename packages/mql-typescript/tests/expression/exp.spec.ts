/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/exp/#example}
 */
function test0() {
  type accounts = {
    _id: number;
    interestRate: number;
    presentValue: number;
  };

  const aggregation: schema.Pipeline<accounts> = [
    {
      $project: {
        effectiveRate: { $subtract: [{ $exp: '$interestRate' }, 1] },
      },
    },
  ];
}
