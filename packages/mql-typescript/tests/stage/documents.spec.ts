/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Test a Pipeline Stage
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/documents/#test-a-pipeline-stage}
 */
function test0() {
  type TestCollection = {
    x: number;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    { $documents: [{ x: 10 }, { x: 2 }, { x: 5 }] },
    { $bucketAuto: { groupBy: '$x', buckets: 4 } },
  ];
}

/**
 * Use a $documents Stage in a $lookup Stage
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/documents/#use-a--documents-stage-in-a--lookup-stage}
 */
function test1() {
  type locations = {
    zip: number;
    name: string;
  };

  const aggregation: schema.Pipeline<locations> = [
    { $match: {} },
    {
      $lookup: {
        localField: 'zip',
        foreignField: 'zip_id',
        as: 'city_state',
        pipeline: [
          {
            $documents: [
              { zip_id: 94301, name: 'Palo Alto, CA' },
              { zip_id: 10019, name: 'New York, NY' },
            ],
          },
        ],
      },
    },
  ];
}
