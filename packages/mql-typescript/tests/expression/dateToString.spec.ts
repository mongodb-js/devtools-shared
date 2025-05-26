import * as schema from '../../out/schema';

import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateToString/#example}
 */
function test0() {
  type sales = {
    _id: number;
    item: string;
    price: number;
    quantity: number;
    date: Date;
  };

  const aggregation: schema.Pipeline<sales> = [
    {
      $project: {
        yearMonthDayUTC: {
          $dateToString: { format: '%Y-%m-%d', date: '$date' },
        },
        timewithOffsetNY: {
          $dateToString: {
            format: '%H:%M:%S:%L%z',
            date: '$date',
            timezone: 'America/New_York',
          },
        },
        timewithOffset430: {
          $dateToString: {
            format: '%H:%M:%S:%L%z',
            date: '$date',
            timezone: '+04:30',
          },
        },
        minutesOffsetNY: {
          $dateToString: {
            format: '%Z',
            date: '$date',
            timezone: 'America/New_York',
          },
        },
        minutesOffset430: {
          $dateToString: { format: '%Z', date: '$date', timezone: '+04:30' },
        },
        abbreviated_month: {
          $dateToString: { format: '%b', date: '$date', timezone: '+04:30' },
        },
        full_month: {
          $dateToString: { format: '%B', date: '$date', timezone: '+04:30' },
        },
      },
    },
  ];
}
