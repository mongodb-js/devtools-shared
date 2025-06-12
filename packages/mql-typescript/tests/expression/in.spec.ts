/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/in/#example}
 */
function test0() {
  type TestCollection = {
    _id: number;
    location: string;
    in_stock: Array<string>;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    {
      $project: {
        'store location': '$location',
        'has bananas': { $in: ['bananas', '$in_stock'] },
      },
    },
  ];
}
