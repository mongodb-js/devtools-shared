import * as schema from '../../out/schema';

import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/binarySize/#example}
 */
function test0() {
  type images = {
    _id: number;
    name: string;
    binary: bson.Binary;
  };

  const aggregation: schema.Pipeline<images> = [
    { $project: { name: '$name', imageSize: { $binarySize: '$binary' } } },
  ];
}
