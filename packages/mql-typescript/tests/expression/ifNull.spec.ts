/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Single Input Expression
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/ifNull/#single-input-expression}
 */
function test0() {
  type inventory = {
    _id: number;
    item: string;
    description: string | null;
    quantity: number;
  };

  const aggregation: schema.Pipeline<inventory> = [
    {
      $project: {
        item: 1,
        description: { $ifNull: ['$description', 'Unspecified'] },
      },
    },
  ];
}

/**
 * Multiple Input Expressions
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/ifNull/#multiple-input-expressions}
 */
function test1() {
  type inventory = {
    _id: number;
    item: string;
    description: string | null;
    quantity: number;
  };

  const aggregation: schema.Pipeline<inventory> = [
    {
      $project: {
        item: 1,
        value: { $ifNull: ['$description', '$quantity', 'Unspecified'] },
      },
    },
  ];
}
