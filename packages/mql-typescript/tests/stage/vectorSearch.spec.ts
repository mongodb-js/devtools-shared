/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * ANN Basic
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/#ann-examples}
 */
function test0() {
  type TestCollection = {
    plot: string;
    title: string;
    score: number;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    {
      $vectorSearch: {
        index: 'vector_index',
        path: 'plot_embedding',
        queryVector: [-0.0016261312, -0.028070757, -0.011342932],
        numCandidates: 150,
        limit: 10,
      },
    },
    {
      $project: {
        _id: 0,
        plot: 1,
        title: 1,
        score: { $meta: 'vectorSearchScore' },
      },
    },
  ];
}

/**
 * ANN Filter
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/#ann-examples}
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
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/#enn-example}
 */
function test2() {
  type TestCollection = {
    plot: string;
    title: string;
    score: number;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    {
      $vectorSearch: {
        index: 'vector_index',
        path: 'plot_embedding',
        queryVector: [-0.006954097, -0.009932499, -0.001311474],
        exact: true,
        limit: 10,
      },
    },
    {
      $project: {
        _id: 0,
        plot: 1,
        title: 1,
        score: { $meta: 'vectorSearchScore' },
      },
    },
  ];
}
