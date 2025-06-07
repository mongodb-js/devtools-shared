import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Match Document Fields
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/lte/#match-document-fields}
 */
function test0() {
  type inventory = {
    item: string;
    quantity: number;
    carrier: {
      name: string;
      fee: number;
    };
  };

  const aggregation: schema.Pipeline<inventory> = [
    { $match: { quantity: { $lte: 20 } } },
  ];
}
