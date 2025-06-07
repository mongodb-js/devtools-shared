import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/mod/#example}
 */
function test0() {
  type conferencePlanning = {
    _id: number;
    city: string;
    hours: number;
    tasks: number;
  };

  const aggregation: schema.Pipeline<conferencePlanning> = [
    { $project: { remainder: { $mod: ['$hours', '$tasks'] } } },
  ];
}
