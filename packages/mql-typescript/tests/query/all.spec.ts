/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Use $all to Match Values
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/all/#use--all-to-match-values}
 */
function test0() {
  type inventory = {
    _id: bson.ObjectId;
    code: string;
    tags: Array<string>;
    qty: Array<{
      size: string;
      num: number;
      color: string;
    }>;
  };

  const aggregation: schema.Pipeline<inventory> = [
    { $match: { tags: { $all: ['appliance', 'school', 'book'] } } },
  ];
}

/**
 * Use $all with $elemMatch
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/all/#use--all-with--elemmatch}
 */
function test1() {
  type inventory = {
    _id: bson.ObjectId;
    code: string;
    tags: Array<string>;
    qty: Array<{
      size: string;
      num: number;
      color: string;
    }>;
  };

  const aggregation: schema.Pipeline<inventory> = [
    {
      $match: {
        qty: {
          $all: [
            { $elemMatch: { size: 'M', num: { $gt: 50 } } },
            { $elemMatch: { num: 100, color: 'green' } },
          ],
        },
      },
    },
  ];
}
