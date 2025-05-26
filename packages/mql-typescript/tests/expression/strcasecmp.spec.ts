import * as schema from '../../out/schema';

import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/strcasecmp/#example}
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
        comparisonResult: { $strcasecmp: ['$quarter', '13q4'] },
      },
    },
  ];
}
