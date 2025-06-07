import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Use in $group Stage
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/last/#use-in--group-stage}
 */
function test0() {
  type sales = {
    _id: number;
    item: string;
    date: Date;
    price: number;
    quantity: number;
  };

  const aggregation: schema.Pipeline<sales> = [
    { $sort: { item: 1, date: 1 } },
    { $group: { _id: '$item', lastSalesDate: { $last: '$date' } } },
  ];
}

/**
 * Use in $setWindowFields Stage
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/last/#use-in--setwindowfields-stage}
 */
function test1() {
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
        sortBy: { orderDate: 1 },
        output: {
          lastOrderTypeForState: {
            $last: '$type',
            window: { documents: ['current', 'unbounded'] },
          },
        },
      },
    },
  ];
}
