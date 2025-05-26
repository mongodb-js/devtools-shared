import * as schema from '../../out/schema';

import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/switch/#example}
 */
function test0() {
  type TestCollection = {
    _id: number;
    name: string;
    scores: Array<number>;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    {
      $project: {
        name: 1,
        summary: {
          $switch: {
            branches: [
              {
                case: { $gte: [{ $avg: ['$scores'] }, 90] },
                then: 'Doing great!',
              },
              {
                case: {
                  $and: [
                    { $gte: [{ $avg: ['$scores'] }, 80] },
                    { $lt: [{ $avg: ['$scores'] }, 90] },
                  ],
                },
                then: 'Doing pretty well.',
              },
              {
                case: { $lt: [{ $avg: ['$scores'] }, 80] },
                then: 'Needs improvement.',
              },
            ],
            default: 'No scores found.',
          },
        },
      },
    },
  ];
}
