import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Add Fields that Contain Periods
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/setField/#add-fields-that-contain-periods--.-}
 */
function test0() {
  type inventory = {
    _id: number;
    item: string;
    price: number;
    qty: number;
  };

  const aggregation: schema.Pipeline<inventory> = [
    {
      $replaceWith: {
        $setField: { field: 'price.usd', input: '$$ROOT', value: '$price' },
      },
    },
    { $unset: ['price'] },
  ];
}

/**
 * Add Fields that Start with a Dollar Sign
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/setField/#add-fields-that-start-with-a-dollar-sign----}
 */
function test1() {
  type inventory = {
    _id: number;
    item: string;
    price: number;
    qty: number;
  };

  const aggregation: schema.Pipeline<inventory> = [
    {
      $replaceWith: {
        $setField: {
          field: { $literal: '$price' },
          input: '$$ROOT',
          value: '$price',
        },
      },
    },
    { $unset: ['price'] },
  ];
}

/**
 * Update Fields that Contain Periods
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/setField/#update-fields-that-contain-periods--.-}
 */
function test2() {
  type inventory = {
    _id: number;
    item: string;
    qty: number;
    'price.usd': number;
  };

  const aggregation: schema.Pipeline<inventory> = [
    { $match: { _id: 1 } },
    {
      $replaceWith: {
        $setField: { field: 'price.usd', input: '$$ROOT', value: 49.99 },
      },
    },
  ];
}

/**
 * Update Fields that Start with a Dollar Sign
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/setField/#update-fields-that-start-with-a-dollar-sign----}
 */
function test3() {
  type inventory = {
    _id: number;
    item: string;
    qty: number;
    $price: number;
  };

  const aggregation: schema.Pipeline<inventory> = [
    { $match: { _id: 1 } },
    {
      $replaceWith: {
        $setField: {
          field: { $literal: '$price' },
          input: '$$ROOT',
          value: 49.99,
        },
      },
    },
  ];
}

/**
 * Remove Fields that Contain Periods
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/setField/#remove-fields-that-contain-periods--.-}
 */
function test4() {
  type inventory = {
    _id: number;
    item: string;
    qty: number;
    'price.usd': number;
  };

  const aggregation: schema.Pipeline<inventory> = [
    {
      $replaceWith: {
        $setField: { field: 'price.usd', input: '$$ROOT', value: '$$REMOVE' },
      },
    },
  ];
}

/**
 * Remove Fields that Start with a Dollar Sign
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/setField/#remove-fields-that-start-with-a-dollar-sign----}
 */
function test5() {
  type inventory = {
    _id: number;
    item: string;
    qty: number;
    $price: number;
  };

  const aggregation: schema.Pipeline<inventory> = [
    {
      $replaceWith: {
        $setField: {
          field: { $literal: '$price' },
          input: '$$ROOT',
          value: '$$REMOVE',
        },
      },
    },
  ];
}
