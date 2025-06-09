/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Match Document Fields
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/ne/#match-document-fields-that-are-not-equal}
 */
function test0() {
  type inventory = {
    item: string;
    quantity: number;
    carrier: {
      name: string;
      fee: number;
    };
  };

  const aggregation: schema.Pipeline<inventory> = [
    { $match: { quantity: { $ne: 20 } } },
  ];
}
