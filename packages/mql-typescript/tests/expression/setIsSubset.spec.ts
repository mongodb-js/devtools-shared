import * as schema from '../../out/schema';

import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/setIsSubset/#example}
 */
function test0() {
  type flowers = {
    _id: number;
    flowerFieldA: Array<string>;
    flowerFieldB: Array<string | Array<string>>;
  };

  const aggregation: schema.Pipeline<flowers> = [
    {
      $project: {
        flowerFieldA: 1,
        flowerFieldB: 1,
        AisSubset: { $setIsSubset: ['$flowerFieldA', '$flowerFieldB'] },
        _id: 0,
      },
    },
  ];
}
