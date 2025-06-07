import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/sqrt/#example}
 */
function test0() {
  type points = {
    _id: number;
    p1: {
      x: number;
      y: number;
    };
    p2: {
      x: number;
      y: number;
    };
  };

  const aggregation: schema.Pipeline<points> = [
    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (this test accesses nested fields, which is not currently supported).
     */
    {
      $project: {
        distance: {
          $sqrt: {
            $add: [
              { $pow: [{ $subtract: ['$p2.y', '$p1.y'] }, 2] },
              { $pow: [{ $subtract: ['$p2.x', '$p1.x'] }, 2] },
            ],
          },
        },
      },
    } as any,
  ];
}
