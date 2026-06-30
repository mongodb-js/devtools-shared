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
  type movies = {
    plot_embedding: Array<bson.Double | number>;
    plot: string;
    title: string;
  };

  const aggregation: schema.Pipeline<movies> = [
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
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/#examples}
 */
function test1() {
  type movies = {
    plot_embedding: Array<bson.Double | number>;
    year: bson.Int32 | number;
    plot: string;
    title: string;
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
  type movies = {
    plot_embedding: Array<bson.Double | number>;
    plot: string;
    title: string;
  };

  const aggregation: schema.Pipeline<movies> = [
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

/**
 * Stored Source
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/#examples}
 */
function test3() {
  type movies = {
    plot_embedding: Array<bson.Double | number>;
    year: bson.Int32 | number;
    genres: Array<string>;
    plot: string;
    title: string;
  };

  const aggregation: schema.Pipeline<movies> = [
    {
      $vectorSearch: {
        index: 'vector_index',
        path: 'plot_embedding',
        queryVector: [
          -0.03994801267981529, -0.016522614285349846, -0.008775344118475914,
        ],
        filter: {
          $and: [
            { year: { $gt: 1970 } },
            { year: { $lt: 2020 } },
            { genres: { $in: ['Action', 'Drama', 'Comedy'] } },
          ],
        },
        limit: 10,
        numCandidates: 1000,
        returnStoredSource: true,
      },
    },
    {
      $project: {
        _id: 0,
        plot: 1,
        title: 1,
        genres: 1,
        score: { $meta: 'vectorSearchScore' },
      },
    },
  ];
}

/**
 * Nested field
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/#examples}
 */
function test4() {
  // TODO: no schema found for vectorSearch.Nested field
}
