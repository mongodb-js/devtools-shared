import * as schema from '../../out/schema';

import * as bson from 'bson';

/**
 * Add a Future Date
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateAdd/#add-a-future-date}
 */
function test0() {
  type shipping = {
    custId: number;
    purchaseDate: Date;
  };

  const aggregation: schema.Pipeline<shipping> = [
    {
      $project: {
        expectedDeliveryDate: {
          $dateAdd: { startDate: '$purchaseDate', unit: 'day', amount: 3 },
        },
      },
    },
    { $merge: { into: 'shipping' } },
  ];
}

/**
 * Filter on a Date Range
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateAdd/#filter-on-a-date-range}
 */
function test1() {
  type shipping = {
    custId: number;
    purchaseDate: Date;
    deliveryDate: Date;
  };

  const aggregation: schema.Pipeline<shipping> = [
    {
      $match: {
        $expr: {
          $gt: [
            '$deliveryDate',
            {
              $dateAdd: { startDate: '$purchaseDate', unit: 'day', amount: 5 },
            },
          ],
        },
      },
    },
    {
      $project: {
        _id: 0,
        custId: 1,
        purchased: {
          $dateToString: { format: '%Y-%m-%d', date: '$purchaseDate' },
        },
        delivery: {
          $dateToString: { format: '%Y-%m-%d', date: '$deliveryDate' },
        },
      },
    },
  ];
}

/**
 * Adjust for Daylight Savings Time
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateAdd/#adjust-for-daylight-savings-time}
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
              $dateAdd: {
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
              $dateAdd: {
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
              $dateAdd: {
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
              $dateAdd: {
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
