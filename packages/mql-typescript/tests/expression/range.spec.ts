import * as schema from '../../out/schema';

import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/range/#example}
 */
function test0() {
  type distances = {
    _id: number;
    city: string;
    distance: number;
  };

  const aggregation: schema.Pipeline<distances> = [
    {
      $project: {
        _id: 0,
        city: 1,
        'Rest stops': { $range: [0, '$distance', 25] },
      },
    },
  ];
}
