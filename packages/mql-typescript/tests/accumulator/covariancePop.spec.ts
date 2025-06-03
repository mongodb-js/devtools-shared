import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/covariancePop/#example}
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
        sortBy: { orderDate: 1 },
        output: {
          covariancePopForState: {
            $covariancePop: [{ $year: { date: '$orderDate' } }, '$quantity'],
            window: { documents: ['unbounded', 'current'] },
          },
        },
      },
    },
  ];
}
