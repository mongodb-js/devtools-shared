import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Use in $group Stage
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/stdDevSamp/#use-in--group-stage}
 */
function test0() {
  type users = {
    _id: number;
    username: string;
    age: number;
  };

  const aggregation: schema.Pipeline<users> = [
    { $sample: { size: 100 } },
    { $group: { _id: null, ageStdDev: { $stdDevSamp: '$age' } } },
  ];
}

/**
 * Use in $setWindowFields Stage
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/stdDevSamp/#use-in--setwindowfields-stage}
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
          stdDevSampQuantityForState: {
            $stdDevSamp: '$quantity',
            window: { documents: ['unbounded', 'current'] },
          },
        },
      },
    },
  ];
}
