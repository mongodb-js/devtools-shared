import * as schema from '../../out/schema';

import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/toUpper/#example}
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
        item: { $toUpper: '$item' },
        description: { $toUpper: '$description' },
      },
    },
  ];
}
