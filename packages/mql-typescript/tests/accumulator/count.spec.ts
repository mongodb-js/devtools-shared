import * as schema from '../../out/schema';

/**
 * Use in $group Stage
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/count-accumulator/#use-in--group-stage}
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
      $group: { _id: '$state', countNumberOfDocumentsForState: { $count: {} } },
    },
  ];
}

/**
 * Use in $setWindowFields Stage
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/count-accumulator/#use-in--setwindowfields-stage}
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
          countNumberOfDocumentsForState: {
            $count: {},
            window: { documents: ['unbounded', 'current'] },
          },
        },
      },
    },
  ];
}
