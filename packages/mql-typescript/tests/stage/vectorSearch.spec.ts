/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * ANN Basic
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/#examples}
 */
function test0() {
  // TODO: no schema found for vectorSearch.ANN Basic: // TODO: No schema found in docs
}

/**
 * ANN Filter
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/#examples}
 */
function test1() {
  type movies = {
    _id: {
      $oid: string;
    };
    title: string;
    year: {
      $numberInt: string;
    };
    runtime: {
      $numberInt: string;
    };
    released: {
      $date: {
        $numberLong: string;
      };
    };
    poster: string;
    plot: string;
    fullplot: string;
    lastupdated: string;
    type: string;
    directors: Array<string>;
    imdb: {
      rating: {
        $numberDouble: string;
      };
      votes: {
        $numberInt: string;
      };
      id: {
        $numberInt: string;
      };
    };
    cast: Array<string>;
    countries: Array<string>;
    genres: Array<string>;
    tomatoes: {
      viewer: {
        rating: {
          $numberDouble: string;
        };
        numReviews: {
          $numberInt: string;
        };
      };
      lastUpdated: {
        $date: {
          $numberLong: string;
        };
      };
    };
    num_mflix_comments: {
      $numberInt: string;
    };
  };

  const aggregation: schema.Pipeline<movies> = [
    {
      $vectorSearch: {
        index: 'vector_index',
        path: 'plot_embedding',
        filter: { $and: [{ year: { $lt: 1975 } }] },
        queryVector: [0.02421053, -0.022372592, -0.006231137],
        numCandidates: 150,
        limit: 10,
      },
    },
    {
      $project: {
        _id: 0,
        title: 1,
        plot: 1,
        year: 1,
        score: { $meta: 'vectorSearchScore' },
      },
    },
  ];
}

/**
 * ENN
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/#examples}
 */
function test2() {
  // TODO: no schema found for vectorSearch.ENN: // TODO: No schema found in docs
}

/**
 * Stored Source
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/#examples}
 */
function test3() {
  // TODO: no schema found for vectorSearch.Stored Source: // TODO: No schema found in docs
}

/**
 * Nested field
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/#examples}
 */
function test4() {
  // TODO: no schema found for vectorSearch.Nested field: // TODO: No schema found in docs
}
