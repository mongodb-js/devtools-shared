/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Convert String to Object
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/toObject/#convert-string-to-object}
 */
function test0() {
  type jsonStrings = {
    _id: number;
    config: string;
  };

  const aggregation: schema.Pipeline<jsonStrings> = [
    { $project: { _id: 0, parsedConfig: { $toObject: '$config' } } },
  ];
}
