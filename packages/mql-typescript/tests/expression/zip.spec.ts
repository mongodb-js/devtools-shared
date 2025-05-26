import * as schema from '../../out/schema';

import * as bson from 'bson';

/**
 * Matrix Transposition
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/zip/#matrix-transposition}
 */
function test0() {
  type matrices = {
    matrix: Array<Array<number>>;
  };

  const aggregation: schema.Pipeline<matrices> = [
    {
      $project: {
        _id: false,
        transposed: {
          $zip: {
            inputs: [
              { $arrayElemAt: ['$matrix', 0] },
              { $arrayElemAt: ['$matrix', 1] },
              { $arrayElemAt: ['$matrix', 2] },
            ],
          },
        },
      },
    },
  ];
}

/**
 * Filtering and Preserving Indexes
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/zip/#filtering-and-preserving-indexes}
 */
function test1() {
  type pages = {
    category: string;
    pages: Array<{
      title: string;
      reviews: number;
    }>;
  };

  const aggregation: schema.Pipeline<pages> = [
    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (this test accesses nested fields, which is not currently supported).
     */
    {
      $project: {
        _id: false,
        pages: {
          $filter: {
            input: {
              $zip: {
                inputs: ['$pages', { $range: [0, { $size: '$pages' }] }],
              },
            },
            as: 'pageWithIndex',
            cond: {
              $let: {
                vars: { page: { $arrayElemAt: ['$$pageWithIndex', 0] } },
                in: { $gte: ['$$page.reviews', 1] },
              },
            },
          },
        },
      },
    } as any,
  ];
}
