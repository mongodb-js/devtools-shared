/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Within a Polygon
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/geoWithin/#within-a-polygon}
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
          $geoWithin: {
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
 * Within a Big Polygon
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/geoWithin/#within-a--big--polygon}
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
          $geoWithin: {
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
