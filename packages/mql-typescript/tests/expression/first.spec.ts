/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Use in $addFields Stage
 */
function test0() {
  type collection = {
    items: Array<string>;
  };

  const aggregation: schema.Pipeline<collection> = [
    { $addFields: { firstItem: { $first: '$items' } } },
  ];
}
