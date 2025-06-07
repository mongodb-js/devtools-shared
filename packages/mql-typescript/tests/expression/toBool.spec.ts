import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/toBool/#example}
 */
function test0() {
  type orders = {
    _id: number;
    item: string;
    qty: number;
    shipped: string | number | boolean;
  };

  const aggregation: schema.Pipeline<orders> = [
    {
      $addFields: {
        convertedShippedFlag: {
          $switch: {
            branches: [
              { case: { $eq: ['$shipped', 'false'] }, then: false },
              { case: { $eq: ['$shipped', ''] }, then: false },
            ],
            default: { $toBool: '$shipped' },
          },
        },
      },
    },

    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (it may involve a projected field).
     */
    { $match: { convertedShippedFlag: false } } as any,
  ];
}
