/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Within a Single Collection
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/graphLookup/#within-a-single-collection}
 */
function test0() {
  type employees = {
    _id: number;
    name: string;
    reportsTo: string;
  };

  const aggregation: schema.Pipeline<employees> = [
    {
      $graphLookup: {
        from: 'employees',
        startWith: '$reportsTo',
        connectFromField: 'reportsTo',
        connectToField: 'name',
        as: 'reportingHierarchy',
      },
    },
  ];
}

/**
 * Across Multiple Collections
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/graphLookup/#across-multiple-collections}
 */
function test1() {
  type airports = {
    _id: number;
    airport: string;
    connects: Array<string>;
  };

  const aggregation: schema.Pipeline<airports> = [
    {
      $graphLookup: {
        from: 'airports',
        startWith: '$nearestAirport',
        connectFromField: 'connects',
        connectToField: 'airport',
        maxDepth: 2,
        depthField: 'numConnections',
        as: 'destinations',
      },
    },
  ];
}

/**
 * With a Query Filter
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/graphLookup/#with-a-query-filter}
 */
function test2() {
  type people = {
    _id: number;
    name: string;
    friends: Array<string>;
    hobbies: Array<string>;
  };

  const aggregation: schema.Pipeline<people> = [
    { $match: { name: 'Tanya Jordan' } },
    {
      $graphLookup: {
        from: 'people',
        startWith: '$friends',
        connectFromField: 'friends',
        connectToField: 'name',
        as: 'golfers',
        restrictSearchWithMatch: { hobbies: 'golf' },
      },
    },
    {
      $project: {
        name: 1,
        friends: 1,
        'connections who play golf': '$golfers.name',
      },
    },
  ];
}
