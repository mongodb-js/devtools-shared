/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * $regexFindAll and Its Options
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/regexFindAll/#-regexfindall-and-its-options}
 */
function test0() {
  type products = {
    _id: number;
    description: string;
  };

  const aggregation: schema.Pipeline<products> = [
    {
      $addFields: {
        returnObject: {
          $regexFindAll: {
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
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/regexFindAll/#i-option}
 */
function test1() {
  type products = {
    _id: number;
    description: string;
  };

  const aggregation: schema.Pipeline<products> = [
    {
      $addFields: {
        returnObject: {
          $regexFindAll: {
            input: '$description',
            regex: new bson.BSONRegExp('line', 'i'),
          },
        },
      },
    },
    {
      $addFields: {
        returnObject: {
          $regexFindAll: { input: '$description', regex: 'line', options: 'i' },
        },
      },
    },
    {
      $addFields: {
        returnObject: {
          $regexFindAll: {
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
 * Use $regexFindAll to Parse Email from String
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/regexFindAll/#use--regexfindall-to-parse-email-from-string}
 */
function test2() {
  type feedback = {
    _id: number;
    comment: string;
  };

  const aggregation: schema.Pipeline<feedback> = [
    {
      $addFields: {
        email: {
          $regexFindAll: {
            input: '$comment',
            regex: new bson.BSONRegExp(
              '[a-z0-9_.+-]+@[a-z0-9_.+-]+\\.[a-z0-9_.+-]+',
              'i',
            ),
          },
        },
      },
    },
    { $set: { email: '$email.match' } },
  ];
}

/**
 * Use Captured Groupings to Parse User Name
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/regexFindAll/#use-captured-groupings-to-parse-user-name}
 */
function test3() {
  type feedback = {
    _id: number;
    comment: string;
  };

  const aggregation: schema.Pipeline<feedback> = [
    {
      $addFields: {
        names: {
          $regexFindAll: {
            input: '$comment',
            regex: new bson.BSONRegExp(
              '([a-z0-9_.+-]+)@[a-z0-9_.+-]+\\.[a-z0-9_.+-]+',
              'i',
            ),
          },
        },
      },
    },

    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (it may involve a projected field).
     */
    {
      $set: {
        names: {
          $reduce: {
            input: '$names.captures',
            initialValue: [],
            in: { $concatArrays: ['$$value', '$$this'] },
          },
        },
      },
    } as any,
  ];
}
