/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Convert String to Array
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/toArray/#convert-string-to-array}
 */
function test0() {
  type jsonStrings = {
    _id: number;
  };

  const aggregation: schema.Pipeline<jsonStrings> = [
    {
      $project: {
        _id: 0,
        numbers: { $toArray: '[1, 2, 3]' },
        documents: { $toArray: '[{"a": 1}, {"b": 2}]' },
      },
    },
  ];
}

/**
 * Convert binData to Array
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/toArray/#convert-bindata-to-array}
 */
function test1() {
  type t = {
    _id: number;
    v: bson.Binary;
  };

  const aggregation: schema.Pipeline<t> = [
    { $project: { _id: 0, original: '$v', asArray: { $toArray: '$v' } } },
  ];
}
