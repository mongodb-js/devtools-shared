import * as schema from '../../out/schema';

/**
 * Use in $group Stage
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/avg/#use-in--group-stage}
 */
function test0() {
  type sales = {
    _id: number;
    item: string;
    price: number;
    quantity: number;
    date: Date;
  };

  const aggregation: schema.Pipeline<sales> = [
    {
      $group: {
        _id: '$item',
        avgAmount: { $avg: { $multiply: ['$price', '$quantity'] } },
        avgQuantity: { $avg: '$quantity' },
      },
    },
  ];
}

/**
 * Use in $setWindowFields Stage
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/avg/#use-in--setwindowfields-stage}
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
          averageQuantityForState: {
            $avg: '$quantity',
            window: { documents: ['unbounded', 'current'] },
          },
        },
      },
    },
  ];
}
