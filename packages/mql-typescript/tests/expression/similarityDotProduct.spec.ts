/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/similarityDotProduct/#example}
 */
function test0() {
  type vectors = {
    _id: number;
    a: Array<number>;
    b: Array<number>;
  };

  const aggregation: schema.Pipeline<vectors> = [
    {
      $project: {
        raw: { $similarityDotProduct: { vectors: ['$a', '$b'] } },
        normalized: {
          $similarityDotProduct: { vectors: ['$a', '$b'], score: true },
        },
      },
    },
  ];
}
