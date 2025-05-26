import * as schema from '../../out/schema';

import * as bson from 'bson';

/**
 * Query Fields that Contain Periods
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/getField/#query-fields-that-contain-periods--.-}
 */
function test0() {
  type inventory = {
    _id: number;
    item: string;
    'price.usd': number;
    qty: number;
  };

  const aggregation: schema.Pipeline<inventory> = [
    {
      $match: { $expr: { $gt: [{ $getField: { field: 'price.usd' } }, 200] } },
    },
  ];
}

/**
 * Query Fields that Start with a Dollar Sign
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/getField/#query-fields-that-start-with-a-dollar-sign----}
 */
function test1() {
  type inventory = {
    _id: number;
    item: string;
    $price: number;
    qty: number;
  };

  const aggregation: schema.Pipeline<inventory> = [
    {
      $match: {
        $expr: { $gt: [{ $getField: { field: { $literal: '$price' } } }, 200] },
      },
    },
  ];
}

/**
 * Query a Field in a Sub-document
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/getField/#query-a-field-in-a-sub-document}
 */
function test2() {
  type inventory = {
    _id: number;
    item: string;
    'price.usd': number;
    quantity: {
      $large: number;
      $medium: number;
      $small: number;
    };
  };

  const aggregation: schema.Pipeline<inventory> = [
    {
      $match: {
        $expr: {
          $lte: [
            {
              $getField: { field: { $literal: '$small' }, input: '$quantity' },
            },
            20,
          ],
        },
      },
    },
  ];
}
