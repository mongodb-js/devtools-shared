import * as schema from '../../out/schema';

import * as bson from 'bson';

/**
 * textScore
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/meta/#-meta---textscore-}
 */
function test0() {
  type articles = {
    _id: number;
    title: string;
  };

  const aggregation: schema.Pipeline<articles> = [
    { $match: { $text: { $search: 'cake' } } },
    { $group: { _id: { $meta: 'textScore' }, count: { $sum: 1 } } },
  ];
}

/**
 * indexKey
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/meta/#-meta---indexkey-}
 */
function test1() {
  type orders = {
    item: string;
    price: bson.Decimal128;
    quantity: number;
    type: string;
  };

  const aggregation: schema.Pipeline<orders> = [
    { $match: { type: 'apparel' } },
    { $addFields: { idxKey: { $meta: 'indexKey' } } },
  ];
}
