/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Replace Using a String
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/replaceAll/#replace-using-a-string}
 */
function test0() {
  type inventory = {
    _id: number;
    item: string;
  };

  const aggregation: schema.Pipeline<inventory> = [
    {
      $project: {
        item: {
          $replaceAll: {
            input: '$item',
            find: 'blue paint',
            replacement: 'red paint',
          },
        },
      },
    },
  ];
}

/**
 * Replace Using Regex
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/replaceAll/#replace-using-regex}
 */
function test1() {
  type inventory = {
    _id: number;
    item: string;
  };

  const aggregation: schema.Pipeline<inventory> = [
    {
      $project: {
        item: {
          $replaceAll: {
            input: '$item',
            find: new bson.BSONRegExp('\\bblue paint\\b', ''),
            replacement: 'red paint',
          },
        },
      },
    },
  ];
}
