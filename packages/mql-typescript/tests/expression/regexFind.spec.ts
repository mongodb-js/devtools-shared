/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * $regexFind and Its Options
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/regexFind/#-regexfind-and-its-options}
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
          $regexFind: {
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
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/regexFind/#i-option}
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
          $regexFind: {
            input: '$description',
            regex: { pattern: 'line', options: 'i' },
          },
        },
      },
    },
    {
      $addFields: {
        returnObject: {
          $regexFind: { input: '$description', regex: 'line', options: 'i' },
        },
      },
    },
    {
      $addFields: {
        returnObject: {
          $regexFind: {
            input: '$description',
            regex: { pattern: 'line', options: '' },
            options: 'i',
          },
        },
      },
    },
  ];
}
