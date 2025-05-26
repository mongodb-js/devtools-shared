import * as schema from '../../out/schema';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/covarianceSamp/#example}
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
          covarianceSampForState: {
            $covarianceSamp: [{ $year: { date: '$orderDate' } }, '$quantity'],
            window: { documents: ['unbounded', 'current'] },
          },
        },
      },
    },
  ];
}
