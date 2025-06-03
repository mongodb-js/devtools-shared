import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Multiplication
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/reduce/#multiplication}
 */
function test0() {
  type events = {
    _id: number;
    type: string;
    experimentId: string;
    description: string;
    eventNum: number;
    probability: number;
  };

  const aggregation: schema.Pipeline<events> = [
    {
      $group: {
        _id: '$experimentId',
        probabilityArr: { $push: '$probability' },
      },
    },

    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (it may involve a projected field).
     */
    {
      $project: {
        description: 1,
        results: {
          $reduce: {
            input: '$probabilityArr',
            initialValue: 1,
            in: { $multiply: ['$$value', '$$this'] },
          },
        },
      },
    } as any,
  ];
}

/**
 * Discounted Merchandise
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/reduce/#discounted-merchandise}
 */
function test1() {
  type clothes = {
    _id: number;
    productId: string;
    description: string;
    color: string;
    size: string;
    price: number;
    discounts: Array<number>;
  };

  const aggregation: schema.Pipeline<clothes> = [
    {
      $project: {
        discountedPrice: {
          $reduce: {
            input: '$discounts',
            initialValue: '$price',
            in: { $multiply: ['$$value', { $subtract: [1, '$$this'] }] },
          },
        },
      },
    },
  ];
}

/**
 * String Concatenation
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/reduce/#string-concatenation}
 */
function test2() {
  type people = {
    _id: number;
    name: string;
    hobbies: Array<string>;
  };

  const aggregation: schema.Pipeline<people> = [
    { $match: { hobbies: { $gt: [] } } },
    {
      $project: {
        name: 1,
        bio: {
          $reduce: {
            input: '$hobbies',
            initialValue: 'My hobbies include:',
            in: {
              $concat: [
                '$$value',
                {
                  $cond: {
                    if: { $eq: ['$$value', 'My hobbies include:'] },
                    then: ' ',
                    else: ', ',
                  },
                },
                '$$this',
              ],
            },
          },
        },
      },
    },
  ];
}

/**
 * Array Concatenation
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/reduce/#array-concatenation}
 */
function test3() {
  type matrices = {
    _id: number;
    arr: Array<Array<number>>;
  };

  const aggregation: schema.Pipeline<matrices> = [
    {
      $project: {
        collapsed: {
          $reduce: {
            input: '$arr',
            initialValue: [],
            in: { $concatArrays: ['$$value', '$$this'] },
          },
        },
      },
    },
  ];
}

/**
 * Computing a Multiple Reductions
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/reduce/#computing-a-multiple-reductions}
 */
function test4() {
  type events = {
    _id: number;
    type: string;
    experimentId: string;
    description: string;
    eventNum: number;
    probability: number;
  };

  const aggregation: schema.Pipeline<events> = [
    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (this test accesses nested fields, which is not currently supported).
     */
    {
      $project: {
        results: {
          $reduce: {
            input: '$arr',
            initialValue: [],
            in: {
              collapsed: { $concatArrays: ['$$value.collapsed', '$$this'] },
              firstValues: {
                $concatArrays: [
                  '$$value.firstValues',
                  { $slice: ['$$this', 1] },
                ],
              },
            },
          },
        },
      },
    } as any,
  ];
}
