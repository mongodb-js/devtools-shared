/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateFromParts/#example}
 */
function test0() {
  type sales = {
    _id: bson.ObjectId;
  };

  const aggregation: schema.Pipeline<sales> = [
    {
      $project: {
        date: { $dateFromParts: { year: 2017, month: 2, day: 8, hour: 12 } },
        date_iso: {
          $dateFromParts: {
            isoWeekYear: 2017,
            isoWeek: 6,
            isoDayOfWeek: 3,
            hour: 12,
          },
        },
        date_timezone: {
          $dateFromParts: {
            year: 2016,
            month: 12,
            day: 31,
            hour: 23,
            minute: 46,
            second: 12,
            timezone: 'America/New_York',
          },
        },
      },
    },
  ];
}
