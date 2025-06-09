/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/facet/#example}
 */
function test0() {
  type artwork = {
    _id: number;
    title: string;
    artist: string;
    year: number;
    price: bson.Decimal128;
    tags: Array<string>;
  };

  const aggregation: schema.Pipeline<artwork> = [
    {
      $facet: {
        categorizedByTags: [
          { $unwind: { path: '$tags' } },
          { $sortByCount: '$tags' },
        ],
        categorizedByPrice: [
          { $match: { price: { $exists: true } } },
          {
            $bucket: {
              groupBy: '$price',
              boundaries: [0, 150, 200, 300, 400],
              default: 'Other',
              output: { count: { $sum: 1 }, titles: { $push: '$title' } },
            },
          },
        ],
        'categorizedByYears(Auto)': [
          { $bucketAuto: { groupBy: '$year', buckets: 4 } },
        ],
      },
    },
  ];
}
