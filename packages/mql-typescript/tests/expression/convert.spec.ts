/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/convert/#example}
 */
function test0() {
  type orders = {
    _id: number;
    item: string;
    qty: number;
    price: bson.Decimal128 | number | string;
  };

  const aggregation: schema.Pipeline<orders> = [
    {
      $addFields: {
        convertedPrice: {
          $convert: {
            input: '$price',
            to: 'decimal',
            onError: 'Error',
            onNull: {
              bytes: {
                '0': 0,
                '1': 0,
                '2': 0,
                '3': 0,
                '4': 0,
                '5': 0,
                '6': 0,
                '7': 0,
                '8': 0,
                '9': 0,
                '10': 0,
                '11': 0,
                '12': 0,
                '13': 0,
                '14': 64,
                '15': 48,
              },
            },
          },
        },
        convertedQty: {
          $convert: {
            input: '$qty',
            to: 'int',
            onError: {
              $concat: [
                'Could not convert ',
                { $toString: '$qty' },
                ' to type integer.',
              ],
            },
            onNull: 0,
          },
        },
      },
    },

    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (it may involve a projected field).
     */
    {
      $project: {
        totalPrice: {
          $switch: {
            branches: [
              {
                case: { $eq: [{ $type: '$convertedPrice' }, 'string'] },
                then: 'NaN',
              },
              {
                case: { $eq: [{ $type: '$convertedQty' }, 'string'] },
                then: 'NaN',
              },
            ],
            default: { $multiply: ['$convertedPrice', '$convertedQty'] },
          },
        },
      },
    } as any,
  ];
}
