import * as schema from '../../out/schema';

import * as bson from 'bson';

/**
 * Add Numbers
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/add/#add-numbers}
 */
function test0() {
  type TestCollection = {
    _id: number;
    item: string;
    price: number;
    fee: number;
    date: Date;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    { $project: { item: 1, total: { $add: ['$price', '$fee'] } } },
  ];
}

/**
 * Perform Addition on a Date
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/add/#perform-addition-on-a-date}
 */
function test1() {
  type TestCollection = {
    _id: number;
    item: string;
    price: number;
    fee: number;
    date: Date;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    { $project: { item: 1, billing_date: { $add: ['$date', 259200000] } } },
  ];
}
