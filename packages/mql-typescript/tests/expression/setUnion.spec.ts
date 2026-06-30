/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/setUnion/#example}
 */
function test0() {
  type sales = {
    _id: number;
    items: Array<
      | string
      | {
          accessories: Array<string>;
        }
    >;
    location: string;
  };

  const aggregation: schema.Pipeline<sales> = [
    {
      $project: {
        flowerFieldA: 1,
        flowerFieldB: 1,
        allValues: { $setUnion: ['$flowerFieldA', '$flowerFieldB'] },
        _id: 0,
      },
    },
  ];
}
