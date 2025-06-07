import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Generate Random Data Points
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/rand/#generate-random-data-points}
 */
function test0() {
  type donors = {
    donorId: number;
    amount: number;
    frequency: number;
  };

  const aggregation: schema.Pipeline<donors> = [
    { $set: { amount: { $multiply: [{ $rand: {} }, 100] } } },
    { $set: { amount: { $floor: '$amount' } } },
    { $merge: { into: 'donors' } },
  ];
}

/**
 * Select Random Items From a Collection
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/rand/#select-random-items-from-a-collection}
 */
function test1() {
  type voters = {
    name: string;
    voterId: number;
    district: number;
    registered: boolean;
  };

  const aggregation: schema.Pipeline<voters> = [
    { $match: { district: 3 } },
    { $match: { $expr: { $lt: [0.5, { $rand: {} }] } } },
    { $project: { _id: 0, name: 1, registered: 1 } },
  ];
}
