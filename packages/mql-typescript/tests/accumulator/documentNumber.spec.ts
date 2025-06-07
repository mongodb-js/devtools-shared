import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Document Number for Each State
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/documentNumber/#document-number-for-each-state}
 */
function test0() {
  type cakeSales = {
    _id: number;
    type: string;
    orderDate: Date;
    state: string;
    price: number;
    quantity: number;
  };

  const aggregation: schema.Pipeline<cakeSales> = [
    {
      $setWindowFields: {
        partitionBy: '$state',
        sortBy: { quantity: -1 },
        output: { documentNumberForState: { $documentNumber: {} } },
      },
    },
  ];
}
