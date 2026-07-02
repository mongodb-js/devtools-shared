/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Normalize values with custom range
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/minMaxScaler/#examples}
 */
function test0() {
  type example = {
    a: number;
  };

  const aggregation: schema.Pipeline<example> = [
    {
      $setWindowFields: {
        sortBy: { a: 1 },
        output: {
          scaled: { $minMaxScaler: { input: '$a' } },
          scaledTo100: { $minMaxScaler: { input: '$a', min: 0, max: 100 } },
        },
      },
    },
  ];
}
