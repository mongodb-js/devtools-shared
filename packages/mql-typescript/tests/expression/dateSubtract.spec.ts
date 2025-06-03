import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Subtract A Fixed Amount
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateSubtract/#subtract-a-fixed-amount}
 */
function test0() {
  type connectionTime = {
    custId: number;
    login: Date;
    logout: Date;
  };

  const aggregation: schema.Pipeline<connectionTime> = [
    { $match: { $expr: { $eq: [{ $month: { date: '$logout' } }, 1] } } },
    {
      $project: {
        logoutTime: {
          $dateSubtract: { startDate: '$logout', unit: 'hour', amount: 3 },
        },
      },
    },
    { $merge: { into: 'connectionTime' } },
  ];
}

/**
 * Filter by Relative Dates
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateSubtract/#filter-by-relative-dates}
 */
function test1() {
  type connectionTime = {
    custId: number;
    login: Date;
    logout: Date;
  };

  const aggregation: schema.Pipeline<connectionTime> = [
    {
      $match: {
        $expr: {
          $gt: [
            '$logoutTime',
            { $dateSubtract: { startDate: '$$NOW', unit: 'week', amount: 1 } },
          ],
        },
      },
    },

    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (it may involve a projected field).
     */
    {
      $project: {
        _id: 0,
        custId: 1,
        loggedOut: {
          $dateToString: { format: '%Y-%m-%d', date: '$logoutTime' },
        },
      },
    } as any,
  ];
}

/**
 * Adjust for Daylight Savings Time
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateSubtract/#adjust-for-daylight-savings-time}
 */
function test2() {
  type billing = {
    location: string;
    login: Date;
    logout: Date;
  };

  const aggregation: schema.Pipeline<billing> = [
    {
      $project: {
        _id: 0,
        location: 1,
        start: { $dateToString: { format: '%Y-%m-%d %H:%M', date: '$login' } },
        days: {
          $dateToString: {
            format: '%Y-%m-%d %H:%M',
            date: {
              $dateSubtract: {
                startDate: '$login',
                unit: 'day',
                amount: 1,
                timezone: '$location',
              },
            },
          },
        },
        hours: {
          $dateToString: {
            format: '%Y-%m-%d %H:%M',
            date: {
              $dateSubtract: {
                startDate: '$login',
                unit: 'hour',
                amount: 24,
                timezone: '$location',
              },
            },
          },
        },
        startTZInfo: {
          $dateToString: {
            format: '%Y-%m-%d %H:%M',
            date: '$login',
            timezone: '$location',
          },
        },
        daysTZInfo: {
          $dateToString: {
            format: '%Y-%m-%d %H:%M',
            date: {
              $dateSubtract: {
                startDate: '$login',
                unit: 'day',
                amount: 1,
                timezone: '$location',
              },
            },
            timezone: '$location',
          },
        },
        hoursTZInfo: {
          $dateToString: {
            format: '%Y-%m-%d %H:%M',
            date: {
              $dateSubtract: {
                startDate: '$login',
                unit: 'hour',
                amount: 24,
                timezone: '$location',
              },
            },
            timezone: '$location',
          },
        },
      },
    },
  ];
}
