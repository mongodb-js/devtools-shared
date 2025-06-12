/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Bucket by Year and Filter by Bucket Results
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/bucket/#bucket-by-year-and-filter-by-bucket-results}
 */
function test0() {
  type artists = {
    _id: number;
    last_name: string;
    first_name: string;
    year_born: number;
    year_died: number;
    nationality: string;
  };

  const aggregation: schema.Pipeline<artists> = [
    {
      $bucket: {
        groupBy: '$year_born',
        boundaries: [1840, 1850, 1860, 1870, 1880],
        default: 'Other',
        output: {
          count: { $sum: 1 },
          artists: {
            $push: {
              name: { $concat: ['$first_name', ' ', '$last_name'] },
              year_born: '$year_born',
            },
          },
        },
      },
    },

    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (the output field of the $bucket stage generates new fields that are not available statically).
     */
    { $match: { count: { $gt: 3 } } } as any,
  ];
}

/**
 * Use $bucket with $facet to Bucket by Multiple Fields
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/bucket/#use--bucket-with--facet-to-bucket-by-multiple-fields}
 */
function test1() {
  type artwork = {
    _id: number;
    title: string;
    artist: string;
    year: number;
    price: bson.Decimal128;
  };

  const aggregation: schema.Pipeline<artwork> = [
    {
      $facet: {
        price: [
          {
            $bucket: {
              groupBy: '$price',
              boundaries: [0, 200, 400],
              default: 'Other',
              output: {
                count: { $sum: 1 },
                artwork: { $push: { title: '$title', price: '$price' } },
                averagePrice: { $avg: '$price' },
              },
            },
          },
        ],
        year: [
          {
            $bucket: {
              groupBy: '$year',
              boundaries: [1890, 1910, 1920, 1940],
              default: 'Unknown',
              output: {
                count: { $sum: 1 },
                artwork: { $push: { title: '$title', year: '$year' } },
              },
            },
          },
        ],
      },
    },
  ];
}
