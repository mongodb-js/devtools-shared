/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/similarityCosine/#example}
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
        raw: { $similarityCosine: { vectors: ['$a', '$b'] } },
        normalized: {
          $similarityCosine: { vectors: ['$a', '$b'], score: true },
        },
      },
    },
  ];
}
