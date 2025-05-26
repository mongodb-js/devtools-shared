import * as schema from '../../out/schema';

import * as bson from 'bson';

/**
 * Examples
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexOfCP/#examples}
 */
function test0() {
  type inventory = {
    _id: number;
    item: string | null;
    amount: number;
  };

  const aggregation: schema.Pipeline<inventory> = [
    { $project: { cpLocation: { $indexOfCP: ['$item', 'foo'] } } },
  ];
}
