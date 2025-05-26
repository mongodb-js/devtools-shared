import * as schema from '../../out/schema';

import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/filter/#examples}
 */
function test0() {
  type sales = {
    _id: number;
    items: Array<{
      item_id: number;
      quantity: number;
      price: number;
      name: string;
    }>;
  };

  const aggregation: schema.Pipeline<sales> = [
    {
      $project: {
        items: {
          $filter: {
            input: '$items',
            as: 'item',
            cond: { $gte: ['$$item.price', 100] },
          },
        },
      },
    },
  ];
}

/**
 * Using the limit field
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/filter/#use-the-limit-field}
 */
function test1() {
  type sales = {
    _id: number;
    items: Array<{
      item_id: number;
      quantity: number;
      price: number;
      name: string;
    }>;
  };

  const aggregation: schema.Pipeline<sales> = [
    {
      $project: {
        items: {
          $filter: {
            input: '$items',
            cond: { $gte: ['$$item.price', 100] },
            as: 'item',
            limit: 1,
          },
        },
      },
    },
  ];
}

/**
 * limit Greater than Possible Matches
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/filter/#limit-greater-than-possible-matches}
 */
function test2() {
  type sales = {
    _id: number;
    items: Array<{
      item_id: number;
      quantity: number;
      price: number;
      name: string;
    }>;
  };

  const aggregation: schema.Pipeline<sales> = [
    {
      $project: {
        items: {
          $filter: {
            input: '$items',
            cond: { $gte: ['$$item.price', 100] },
            as: 'item',
            limit: 5,
          },
        },
      },
    },
  ];
}
