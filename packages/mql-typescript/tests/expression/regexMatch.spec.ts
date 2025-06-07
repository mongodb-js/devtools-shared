import * as schema from '../../out/schema';
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
            regex: { pattern: 'line', options: '' },
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
            regex: { pattern: 'line', options: 'i' },
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
            regex: { pattern: 'line', options: '' },
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
                regex: { pattern: '[a-z0-9_.+-]+@mongodb.com', options: 'i' },
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
