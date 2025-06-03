import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Query on GeoJSON Data
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/near/#query-on-geojson-data}
 */
function test0() {
  type places = {
    location: {
      type: string;
      coordinates: Array<bson.Double | number>;
    };
  };

  const aggregation: schema.Pipeline<places> = [
    {
      $match: {
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [-73.9667, 40.78] },
            $minDistance: 1000,
            $maxDistance: 5000,
          },
        },
      },
    },
  ];
}
