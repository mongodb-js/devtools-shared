import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Converting Dates
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateFromString/#converting-dates}
 */
function test0() {
  type logmessages = {
    _id: number;
    date: string;
    timezone: string;
    message: string;
  };

  const aggregation: schema.Pipeline<logmessages> = [
    {
      $project: {
        date: {
          $dateFromString: {
            dateString: '$date',
            timezone: 'America/New_York',
          },
        },
      },
    },
  ];
}

/**
 * onError
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateFromString/#onerror}
 */
function test1() {
  type TestCollection = {
    _id: number;
    date: string;
    timezone: string;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    {
      $project: {
        date: {
          $dateFromString: {
            dateString: '$date',
            timezone: '$timezone',
            onError: '$date',
          },
        },
      },
    },
  ];
}

/**
 * onNull
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateFromString/#onnull}
 */
function test2() {
  type TestCollection = {
    _id: number;
    date: string | null;
    timezone: string;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    {
      $project: {
        date: {
          $dateFromString: {
            dateString: '$date',
            timezone: '$timezone',
            onNull: {},
          },
        },
      },
    },
  ];
}
