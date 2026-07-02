/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/score/}
 */
function test0() {
  type movies = {
    plot_embedding: Array<bson.Double | number>;
  };

  const aggregation: schema.Pipeline<movies> = [
    { $score: { score: { $meta: 'vectorSearchScore' } } },
  ];
}
