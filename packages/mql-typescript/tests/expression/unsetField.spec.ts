/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Remove Fields that Contain Periods
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/unsetField/#remove-fields-that-contain-periods--.-}
 */
function test0() {
  type inventory = {
    _id: number;
    item: string;
    qty: number;
    'price.usd': number;
  };

  const aggregation: schema.Pipeline<inventory> = [
    { $replaceWith: { $unsetField: { field: 'price.usd', input: '$$ROOT' } } },
  ];
}

/**
 * Remove Fields that Start with a Dollar Sign
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/unsetField/#remove-fields-that-start-with-a-dollar-sign----}
 */
function test1() {
  type inventory = {
    _id: number;
    item: string;
    qty: number;
    $price: number;
  };

  const aggregation: schema.Pipeline<inventory> = [
    {
      $replaceWith: {
        $unsetField: { field: { $literal: '$price' }, input: '$$ROOT' },
      },
    },
  ];
}

/**
 * Remove A Subfield
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/unsetField/#remove-a-subfield}
 */
function test2() {
  type inventory = {
    _id: number;
    item: string;
    qty: number;
    price: {
      usd: number;
      euro: number;
    };
  };

  const aggregation: schema.Pipeline<inventory> = [
    {
      $replaceWith: {
        $setField: {
          field: 'price',
          input: '$$ROOT',
          value: {
            $unsetField: {
              field: 'euro',
              input: { $getField: { field: 'price' } },
            },
          },
        },
      },
    },
  ];
}
