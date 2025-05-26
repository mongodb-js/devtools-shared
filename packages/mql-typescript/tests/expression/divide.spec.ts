import * as schema from '../../out/schema';

import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/divide/#examples}
 */
function test0() {
  type conferencePlanning = {
    _id: number;
    city: string;
    hours: number;
    tasks: number;
  };

  const aggregation: schema.Pipeline<conferencePlanning> = [
    { $project: { city: 1, workdays: { $divide: ['$hours', 8] } } },
  ];
}
