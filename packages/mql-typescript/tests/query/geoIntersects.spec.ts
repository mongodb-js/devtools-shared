import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Intersects a Polygon
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/geoIntersects/#intersects-a-polygon}
 */
function test0() {
  type places = {
    loc: {
      type: string;
      coordinates: Array<Array<Array<bson.Double | number>>>;
    };
  };

  const aggregation: schema.Pipeline<places> = [
    {
      $match: {
        loc: {
          $geoIntersects: {
            $geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [0, 0],
                  [3, 6],
                  [6, 1],
                  [0, 0],
                ],
              ],
            },
          },
        },
      },
    },
  ];
}

/**
 * Intersects a Big Polygon
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/geoIntersects/#intersects-a--big--polygon}
 */
function test1() {
  type places = {
    loc: {
      type: string;
      coordinates: Array<Array<Array<bson.Double | number>>>;
    };
  };

  const aggregation: schema.Pipeline<places> = [
    {
      $match: {
        loc: {
          $geoIntersects: {
            $geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [-100, 60],
                  [-100, 0],
                  [-100, -60],
                  [100, -60],
                  [100, 60],
                  [-100, 60],
                ],
              ],
              crs: {
                type: 'name',
                properties: {
                  name: 'urn:x-mongodb:crs:strictwinding:EPSG:4326',
                },
              },
            },
          },
        },
      },
    },
  ];
}
