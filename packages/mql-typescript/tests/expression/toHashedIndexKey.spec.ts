import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/toHashedIndexKey/#example}
 */
function test0() {
  type TestCollection = {
    val: string;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    { $documents: [{ val: 'string to hash' }] },
    { $addFields: { hashedVal: { $toHashedIndexKey: '$val' } } },
  ];
}
