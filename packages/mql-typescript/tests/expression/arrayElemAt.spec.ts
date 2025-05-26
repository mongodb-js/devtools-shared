import * as schema from '../../out/schema';

import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/arrayElemAt/#example}
 */
function test0() {
  type TestCollection = {
    _id: number;
    name: string;
    favorites: Array<string>;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    {
      $project: {
        name: 1,
        first: { $arrayElemAt: ['$favorites', 0] },
        last: { $arrayElemAt: ['$favorites', -1] },
      },
    },
  ];
}
