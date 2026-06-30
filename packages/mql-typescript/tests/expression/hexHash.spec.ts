/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Hash a Field Value
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/hexHash/#hash-a-field-value}
 */
function test0() {
  type files = {
    _id: number;
    filename: string;
    hexHash: string;
  };

  const aggregation: schema.Pipeline<files> = [
    {
      $project: {
        filename: 1,
        hexHash: { $hexHash: { input: '$filename', algorithm: 'sha256' } },
      },
    },
  ];
}

/**
 * Null or Missing Input
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/hexHash/#null-or-missing-input}
 */
function test1() {
  // TODO: no schema found for hexHash.Null or Missing Input
}
