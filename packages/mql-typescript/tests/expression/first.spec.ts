import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Use in $addFields Stage
 */
function test0() {
  type collection = {
    items: Array<string>;
  };

  const aggregation: schema.Pipeline<collection> = [
    { $addFields: { firstItem: { $first: '$items' } } },
  ];
}
