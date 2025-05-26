import * as schema from '../../out/schema';

import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/slice/#example}
 */
function test0() {
  type TestCollection = {
    _id: number;
    name: string;
    favorites: Array<string>;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    { $project: { name: 1, threeFavorites: { $slice: ['$favorites', 3] } } },
  ];
}
