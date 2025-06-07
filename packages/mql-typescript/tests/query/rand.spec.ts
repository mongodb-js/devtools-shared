import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Select Random Items From a Collection
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/rand/#select-random-items-from-a-collection}
 */
function test0() {
  type voters = {
    name: string;
    voterId: number;
    district: number;
    registered: boolean;
  };

  const aggregation: schema.Pipeline<voters> = [
    { $match: { district: 3, $expr: { $lt: [0.5, { $rand: {} }] } } },
    { $project: { _id: 0, name: 1, registered: 1 } },
  ];
}
