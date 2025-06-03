import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Use in $group Stage
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/stdDevPop/#use-in--group-stage}
 */
function test0() {
  type users = {
    _id: number;
    name: string;
    quiz: number;
    score: number;
  };

  const aggregation: schema.Pipeline<users> = [
    { $group: { _id: '$quiz', stdDev: { $stdDevPop: '$score' } } },
  ];
}

/**
 * Use in $setWindowFields Stage
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/stdDevPop/#use-in--setwindowfields-stage}
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
          stdDevPopQuantityForState: {
            $stdDevPop: '$quantity',
            window: { documents: ['unbounded', 'current'] },
          },
        },
      },
    },
  ];
}
