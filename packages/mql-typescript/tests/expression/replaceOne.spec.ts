import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/replaceOne/#example}
 */
function test0() {
  type inventory = {
    _id: number;
    item: string;
  };

  const aggregation: schema.Pipeline<inventory> = [
    {
      $project: {
        item: {
          $replaceOne: {
            input: '$item',
            find: 'blue paint',
            replacement: 'red paint',
          },
        },
      },
    },
  ];
}
