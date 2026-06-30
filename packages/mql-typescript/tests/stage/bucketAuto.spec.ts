/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Single Facet Aggregation
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/bucketAuto/#single-facet-aggregation}
 */
function test0() {
  type artwork = {
    _id: bson.Int32 | number;
    title: string;
    artist: string;
    year: bson.Int32 | number;
    price: bson.Decimal128;
    dimensions: {
      height: bson.Int32 | number;
      width: bson.Int32 | number;
      units: string;
    };
  };

  const aggregation: schema.Pipeline<artwork> = [
    { $bucketAuto: { groupBy: '$price', buckets: 4 } },
  ];
}
