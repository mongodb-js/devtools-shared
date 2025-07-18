/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * $regexMatch and Its Options
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/regexMatch/#-regexmatch-and-its-options}
 */
function test0() {
  type products = {
    _id: number;
    description: string;
  };

  const aggregation: schema.Pipeline<products> = [
    {
      $addFields: {
        result: {
          $regexMatch: {
            input: '$description',
            regex: new bson.BSONRegExp('line', ''),
          },
        },
      },
    },
  ];
}

/**
 * i Option
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/regexMatch/#i-option}
 */
function test1() {
  type products = {
    _id: number;
    description: string;
  };

  const aggregation: schema.Pipeline<products> = [
    {
      $addFields: {
        result: {
          $regexMatch: {
            input: '$description',
            regex: new bson.BSONRegExp('line', 'i'),
          },
        },
      },
    },
    {
      $addFields: {
        result: {
          $regexMatch: { input: '$description', regex: 'line', options: 'i' },
        },
      },
    },
    {
      $addFields: {
        result: {
          $regexMatch: {
            input: '$description',
            regex: new bson.BSONRegExp('line', ''),
            options: 'i',
          },
        },
      },
    },
  ];
}

/**
 * Use $regexMatch to Check Email Address
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/regexMatch/#use--regexmatch-to-check-email-address}
 */
function test2() {
  type feedback = {
    _id: number;
    comment: string;
  };

  const aggregation: schema.Pipeline<feedback> = [
    {
      $addFields: {
        category: {
          $cond: {
            if: {
              $regexMatch: {
                input: '$comment',
                regex: new bson.BSONRegExp('[a-z0-9_.+-]+@mongodb.com', 'i'),
              },
            },
            then: 'Employee',
            else: 'External',
          },
        },
      },
    },
  ];
}
