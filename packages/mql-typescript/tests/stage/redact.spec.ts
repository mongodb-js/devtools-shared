/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Evaluate Access at Every Document Level
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/redact/#evaluate-access-at-every-document-level}
 */
function test0() {
  type forecasts = {
    _id: number;
    title: string;
    tags: Array<string>;
    year: number;
    subsections: Array<{
      subtitle: string;
      tags: Array<string>;
      content:
        | string
        | {
            text: string;
            tags: Array<string>;
          };
    }>;
  };

  const aggregation: schema.Pipeline<forecasts> = [
    { $match: { year: 2014 } },
    {
      $redact: {
        $cond: {
          if: {
            $gt: [{ $size: { $setIntersection: ['$tags', ['STLW', 'G']] } }, 0],
          },
          then: '$$DESCEND',
          else: '$$PRUNE',
        },
      },
    },
  ];
}

/**
 * Exclude All Fields at a Given Level
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/redact/#exclude-all-fields-at-a-given-level}
 */
function test1() {
  type accounts = {
    _id: number;
    level: number;
    acct_id: string;
    cc: {
      level: number;
      type: string;
      num: number;
      exp_date: Date;
      billing_addr: {
        level: number;
        addr1: string;
        city: string;
      };
      shipping_addr: Array<{
        level: number;
        addr1: string;
        city: string;
      }>;
    };
    status: string;
  };

  const aggregation: schema.Pipeline<accounts> = [
    { $match: { status: 'A' } },
    {
      $redact: {
        $cond: {
          if: { $eq: ['$level', 5] },
          then: '$$PRUNE',
          else: '$$DESCEND',
        },
      },
    },
  ];
}
