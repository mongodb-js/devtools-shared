import * as schema from '../../out/schema';

import * as bson from 'bson';

/**
 * Truncate Order Dates in a $project Pipeline Stage
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateTrunc/#truncate-order-dates-in-a--project-pipeline-stage}
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
      $project: {
        _id: 1,
        orderDate: 1,
        truncatedOrderDate: {
          $dateTrunc: {
            date: '$orderDate',
            unit: 'week',
            binSize: 2,
            timezone: 'America/Los_Angeles',
            startOfWeek: 'Monday',
          },
        },
      },
    },
  ];
}

/**
 * Truncate Order Dates and Obtain Quantity Sum in a $group Pipeline Stage
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateTrunc/#truncate-order-dates-and-obtain-quantity-sum-in-a--group-pipeline-stage}
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
      $group: {
        _id: {
          truncatedOrderDate: {
            $dateTrunc: { date: '$orderDate', unit: 'month', binSize: 6 },
          },
        },
        sumQuantity: { $sum: '$quantity' },
      },
    },
  ];
}
