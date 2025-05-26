import * as schema from '../../out/schema';

import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/allElementsTrue/#example}
 */
function test0() {
  type survey = {
    _id: number;
    responses: Array<
      boolean | Array<number | boolean> | number | string | null | undefined
    >;
  };

  const aggregation: schema.Pipeline<survey> = [
    {
      $project: {
        responses: 1,
        isAllTrue: { $allElementsTrue: ['$responses'] },
        _id: 0,
      },
    },
  ];
}
