import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Obtain the Incrementing Ordinal from a Timestamp Field
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/tsIncrement/#obtain-the-incrementing-ordinal-from-a-timestamp-field}
 */
function test0() {
  type stockSales = {
    _id: number;
    symbol: string;
    saleTimestamp: bson.Timestamp;
  };

  const aggregation: schema.Pipeline<stockSales> = [
    {
      $project: {
        _id: 0,
        saleTimestamp: 1,
        saleIncrement: { $tsIncrement: '$saleTimestamp' },
      },
    },
  ];
}

/**
 * Use $tsSecond in a Change Stream Cursor to Monitor Collection Changes
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/tsSecond/#use--tssecond-in-a-change-stream-cursor-to-monitor-collection-changes}
 */
function test1() {
  type stockSales = {
    _id: number;
    symbol: string;
    saleTimestamp: bson.Timestamp;
  };

  const aggregation: schema.Pipeline<stockSales> = [
    {
      $match: {
        $expr: { $eq: [{ $mod: [{ $tsIncrement: '$clusterTime' }, 2] }, 0] },
      },
    },
  ];
}
