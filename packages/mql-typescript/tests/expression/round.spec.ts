import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/round/#example}
 */
function test0() {
  type samples = {
    _id: number;
    value: number;
  };

  const aggregation: schema.Pipeline<samples> = [
    { $project: { roundedValue: { $round: ['$value', 1] } } },
  ];
}
