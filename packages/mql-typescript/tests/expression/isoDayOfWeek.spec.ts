import * as schema from '../../out/schema';

import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/isoDayOfWeek/#example}
 */
function test0() {
  type birthdays = {
    _id: number;
    name: string;
    birthday: Date;
  };

  const aggregation: schema.Pipeline<birthdays> = [
    {
      $project: {
        _id: 0,
        name: '$name',
        dayOfWeek: { $isoDayOfWeek: { date: '$birthday' } },
      },
    },
  ];
}
