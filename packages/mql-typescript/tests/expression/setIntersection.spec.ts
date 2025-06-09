/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Elements Array Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/setIntersection/#elements-array-example}
 */
function test0() {
  type flowers = {
    _id: number;
    flowerFieldA: Array<string>;
    flowerFieldB: Array<string | Array<string>>;
  };

  const aggregation: schema.Pipeline<flowers> = [
    {
      $project: {
        flowerFieldA: 1,
        flowerFieldB: 1,
        commonToBoth: { $setIntersection: ['$flowerFieldA', '$flowerFieldB'] },
        _id: 0,
      },
    },
  ];
}

/**
 * Retrieve Documents for Roles Granted to the Current User
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/setIntersection/#retrieve-documents-for-roles-granted-to-the-current-user}
 */
function test1() {
  type budget = {
    _id: bson.Int32 | number;
    allowedRoles: Array<string>;
    comment: string;
    yearlyBudget: bson.Double | number;
    cloudBudget: bson.Double | number | undefined;
    salesEventsBudget: bson.Double | number | undefined;
  };

  const aggregation: schema.Pipeline<budget> = [
    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (this test accesses nested fields, which is not currently supported).
     */
    {
      $match: {
        $expr: {
          $not: [
            {
              $eq: [
                { $setIntersection: ['$allowedRoles', '$$USER_ROLES.role'] },
                [],
              ],
            },
          ],
        },
      },
    } as any,
  ];
}
