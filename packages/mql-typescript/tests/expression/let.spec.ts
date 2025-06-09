/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/let/#example}
 */
function test0() {
  type sales = {
    _id: number;
    price: number;
    tax: number;
    applyDiscount: boolean;
  };

  const aggregation: schema.Pipeline<sales> = [
    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' ($multiply references a variable that is not available statically).
     */
    {
      $project: {
        finalTotal: {
          $let: {
            vars: {
              total: { $add: ['$price', '$tax'] },
              discounted: {
                $cond: { if: '$applyDiscount', then: 0.9, else: 1 },
              },
            },
            in: { $multiply: ['$$total', '$$discounted'] },
          },
        },
      },
    } as any,
  ];
}
