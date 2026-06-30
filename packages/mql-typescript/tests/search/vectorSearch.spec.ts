/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * ANN Basic
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/vector-search/#basic-example}
 */
function test0() {
  type movies = {
    plot_embedding: Array<bson.Double | number>;
    plot: string;
    title: string;
  };

  const aggregation: schema.Pipeline<movies> = [
    {
      $search: {
        vectorSearch: {
          path: 'plot_embedding',
          queryVector: [-0.0016261312, -0.028070757, -0.011342932],
          numCandidates: 150,
          limit: 10,
        },
      },
    },
    {
      $project: { _id: 0, plot: 1, title: 1, score: { $meta: 'searchScore' } },
    },
  ];
}

/**
 * ANN Filter
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/vector-search/#filter-example}
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
      $search: {
        vectorSearch: {
          path: 'plot_embedding',
          queryVector: [0.02421053, -0.022372592, -0.006231137],
          filter: { range: { path: 'year', lt: 1975 } },
          numCandidates: 150,
          limit: 10,
        },
      },
    },
    {
      $project: {
        _id: 0,
        title: 1,
        plot: 1,
        year: 1,
        score: { $meta: 'searchScore' },
      },
    },
  ];
}

/**
 * ENN
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/vector-search/#enn-example}
 */
function test2() {
  type movies = {
    plot_embedding: Array<bson.Double | number>;
    plot: string;
    title: string;
  };

  const aggregation: schema.Pipeline<movies> = [
    {
      $search: {
        vectorSearch: {
          path: 'plot_embedding',
          queryVector: [-0.006954097, -0.009932499, -0.001311474],
          exact: true,
          limit: 10,
        },
      },
    },
    {
      $project: { _id: 0, plot: 1, title: 1, score: { $meta: 'searchScore' } },
    },
  ];
}
