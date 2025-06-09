/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Single-Byte Character Set
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/substrBytes/#single-byte-character-set}
 */
function test0() {
  type inventory = {
    _id: number;
    item: string;
    quarter: string;
    description: string | null;
  };

  const aggregation: schema.Pipeline<inventory> = [
    {
      $project: {
        item: 1,
        yearSubstring: { $substrBytes: ['$quarter', 0, 2] },
        quarterSubtring: {
          $substrBytes: [
            '$quarter',
            2,
            { $subtract: [{ $strLenBytes: '$quarter' }, 2] },
          ],
        },
      },
    },
  ];
}

/**
 * Single-Byte and Multibyte Character Set
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/substrBytes/#single-byte-and-multibyte-character-set}
 */
function test1() {
  type food = {
    _id: number;
    name: string;
  };

  const aggregation: schema.Pipeline<food> = [
    { $project: { name: 1, menuCode: { $substrBytes: ['$name', 0, 3] } } },
  ];
}
