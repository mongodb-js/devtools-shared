/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';

/**
 * Basic rerank with text query
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/rerank/}
 */
function test0() {
  type TestCollection = {
    plot: string;
    title: string;
    score: number;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    {
      $search: {
        index: 'search_index',
        text: {
          query: 'historical drama',
          path: 'plot',
        },
      },
    },
    {
      $rerank: {
        query: {
          text: {
            query: 'historical drama',
            path: 'plot',
          },
        },
        rankConstant: 60,
        scoreDetails: false,
      },
    },
    {
      $limit: 10,
    },
  ];
}

/**
 * Rerank with scoreDetails enabled
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/rerank/}
 */
function test1() {
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
      $rerank: {
        query: {
          text: {
            query: 'historical drama',
            path: 'plot',
          },
        },
        scoreDetails: true,
      },
    },
  ];
}
