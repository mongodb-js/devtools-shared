/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Maximum Distance
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/geoNear/#maximum-distance}
 */
function test0() {
  type places = {
    name: string;
    location: {
      type: string;
      coordinates: Array<number>;
    };
    category: string;
  };

  const aggregation: schema.Pipeline<places> = [
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [-73.99279, 40.719296] },
        distanceField: 'dist.calculated',
        maxDistance: 2,
        query: { category: 'Parks' },
        includeLocs: 'dist.location',
        spherical: true,
      },
    },
  ];
}

/**
 * Minimum Distance
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/geoNear/#minimum-distance}
 */
function test1() {
  type places = {
    name: string;
    location: {
      type: string;
      coordinates: Array<number>;
    };
    category: string;
  };

  const aggregation: schema.Pipeline<places> = [
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [-73.99279, 40.719296] },
        distanceField: 'dist.calculated',
        minDistance: 2,
        query: { category: 'Parks' },
        includeLocs: 'dist.location',
        spherical: true,
      },
    },
  ];
}

/**
 * with the let option
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/geoNear/#-geonear-with-the-let-option}
 */
function test2() {
  type places = {
    name: string;
    location: {
      type: string;
      coordinates: Array<number>;
    };
    category: string;
  };

  const aggregation: schema.Pipeline<places> = [
    {
      $geoNear: {
        near: '$$pt',
        distanceField: 'distance',
        maxDistance: 2,
        query: { category: 'Parks' },
        includeLocs: 'dist.location',
        spherical: true,
      },
    },
  ];
}

/**
 * with Bound let Option
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/geoNear/#-geonear-with-bound-let-option}
 */
function test3() {
  type places = {
    name: string;
    location: {
      type: string;
      coordinates: Array<number>;
    };
    category: string;
  };

  const aggregation: schema.Pipeline<places> = [
    {
      $lookup: {
        from: 'places',
        let: { pt: '$location' },
        pipeline: [{ $geoNear: { near: '$$pt', distanceField: 'distance' } }],
        as: 'joinedField',
      },
    },
    { $match: { name: 'Sara D. Roosevelt Park' } },
  ];
}

/**
 * Specify Which Geospatial Index to Use
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/geoNear/#specify-which-geospatial-index-to-use}
 */
function test4() {
  type places = {
    _id: number;
    name: string;
    location: {
      type: string;
      coordinates: Array<number>;
    };
    legacy: Array<number>;
    category: string;
  };

  const aggregation: schema.Pipeline<places> = [
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [-73.98142, 40.71782] },
        key: 'location',
        distanceField: 'dist.calculated',
        query: { category: 'Parks' },
      },
    },
    { $limit: 5 },
  ];
}
