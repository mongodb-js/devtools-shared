import * as schema from '../../out/schema';

import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/isoWeek/#example}
 */
function test0() {
  type deliveries = {
    _id: number;
    date: Date;
    city: string;
  };

  const aggregation: schema.Pipeline<deliveries> = [
    {
      $project: {
        _id: 0,
        city: '$city',
        weekNumber: { $isoWeek: { date: '$date' } },
      },
    },
  ];
}
