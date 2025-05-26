import * as schema from '../../out/schema';

/**
 * Dense Rank Partitions by an Integer Field
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/denseRank/#dense-rank-partitions-by-an-integer-field}
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
        output: { denseRankQuantityForState: { $denseRank: {} } },
      },
    },
  ];
}

/**
 * Dense Rank Partitions by a Date Field
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/denseRank/#dense-rank-partitions-by-a-date-field}
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
        output: { denseRankOrderDateForState: { $denseRank: {} } },
      },
    },
  ];
}
