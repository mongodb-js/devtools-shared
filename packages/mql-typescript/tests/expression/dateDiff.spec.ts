/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Elapsed Time
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateDiff/#elapsed-time}
 */
function test0() {
  type orders = {
    custId: number;
    purchased: Date;
    delivered: Date;
  };

  const aggregation: schema.Pipeline<orders> = [
    {
      $group: {
        _id: null,
        averageTime: {
          $avg: {
            $dateDiff: {
              startDate: '$purchased',
              endDate: '$delivered',
              unit: 'day',
            },
          },
        },
      },
    },

    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (it may involve a projected field).
     */
    { $project: { _id: 0, numDays: { $trunc: ['$averageTime', 1] } } } as any,
  ];
}

/**
 * Result Precision
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateDiff/#result-precision}
 */
function test1() {
  type subscriptions = {
    custId: number;
    start: Date;
    end: Date;
  };

  const aggregation: schema.Pipeline<subscriptions> = [
    {
      $project: {
        Start: '$start',
        End: '$end',
        years: {
          $dateDiff: { startDate: '$start', endDate: '$end', unit: 'year' },
        },
        months: {
          $dateDiff: { startDate: '$start', endDate: '$end', unit: 'month' },
        },
        days: {
          $dateDiff: { startDate: '$start', endDate: '$end', unit: 'day' },
        },
        _id: 0,
      },
    },
  ];
}

/**
 * Weeks Per Month
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateDiff/#weeks-per-month}
 */
function test2() {
  type months = {
    month: string;
    start: Date;
    end: Date;
  };

  const aggregation: schema.Pipeline<months> = [
    {
      $project: {
        wks_default: {
          $dateDiff: { startDate: '$start', endDate: '$end', unit: 'week' },
        },
        wks_monday: {
          $dateDiff: {
            startDate: '$start',
            endDate: '$end',
            unit: 'week',
            startOfWeek: 'Monday',
          },
        },
        wks_friday: {
          $dateDiff: {
            startDate: '$start',
            endDate: '$end',
            unit: 'week',
            startOfWeek: 'fri',
          },
        },
        _id: 0,
      },
    },
  ];
}
