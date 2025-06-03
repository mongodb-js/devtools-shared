import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateToParts/#example}
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
        date: { $dateToParts: { date: '$date' } },
        date_iso: { $dateToParts: { date: '$date', iso8601: true } },
        date_timezone: {
          $dateToParts: { date: '$date', timezone: 'America/New_York' },
        },
      },
    },
  ];
}
