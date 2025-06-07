import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Select on Unmatching Documents
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/nin/#select-on-unmatching-documents}
 */
function test0() {
  type inventory = {
    item: string;
    quantity: number;
    tags: Array<string>;
  };

  const aggregation: schema.Pipeline<inventory> = [
    { $match: { quantity: { $nin: [5, 15] } } },
  ];
}

/**
 * Select on Elements Not in an Array
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/nin/#select-on-elements-not-in-an-array}
 */
function test1() {
  type inventory = {
    item: string;
    quantity: number;
    tags: Array<string>;
  };

  const aggregation: schema.Pipeline<inventory> = [
    { $match: { tags: { $nin: ['school'] } } },
  ];
}
