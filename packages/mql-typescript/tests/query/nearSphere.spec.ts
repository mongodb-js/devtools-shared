import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Specify Center Point Using GeoJSON
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/nearSphere/#specify-center-point-using-geojson}
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
          $nearSphere: {
            $geometry: { type: 'Point', coordinates: [-73.9667, 40.78] },
            $minDistance: 1000,
            $maxDistance: 5000,
          },
        },
      },
    },
  ];
}
