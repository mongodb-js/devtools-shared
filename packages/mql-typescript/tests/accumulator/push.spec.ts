import * as schema from '../../out/schema';

/**
 * Use in $group Stage
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/push/#use-in--group-stage}
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
    { $sort: { date: 1, item: 1 } },
    {
      $group: {
        _id: {
          day: { $dayOfYear: { date: '$date' } },
          year: { $year: { date: '$date' } },
        },
        itemsSold: { $push: { item: '$item', quantity: '$quantity' } },
      },
    },
  ];
}

/**
 * Use in $setWindowFields Stage
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/push/#use-in--setwindowfields-stage}
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
          quantitiesForState: {
            $push: '$quantity',
            window: { documents: ['unbounded', 'current'] },
          },
        },
      },
    },
  ];
}
