/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/size/#example}
 */
function test0() {
  type inventory = {
    _id: number;
    item: string;
    description: string;
    colors: Array<string> | string;
  };

  const aggregation: schema.Pipeline<inventory> = [
    {
      $project: {
        item: 1,
        numberOfColors: {
          $cond: {
            if: { $isArray: ['$colors'] },
            then: { $size: '$colors' },
            else: 'NA',
          },
        },
      },
    },
  ];
}
