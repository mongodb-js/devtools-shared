/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * must and mustNot
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/compound/#must-and-mustnot-example}
 */
function test0() {
  type TestCollection = {
    _id: number;
    type: string;
    description: string;
    category: string;
    in_stock: boolean;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    {
      $search: {
        compound: {
          must: [{ text: { query: 'varieties', path: 'description' } }],
          mustNot: [{ text: { query: 'apples', path: 'description' } }],
        },
      },
    },
  ];
}

/**
 * must and should
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/compound/#must-and-should-example}
 */
function test1() {
  type TestCollection = {
    _id: number;
    type: string;
    description: string;
    category: string;
    in_stock: boolean;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    {
      $search: {
        compound: {
          must: [{ text: { query: 'varieties', path: 'description' } }],
          should: [{ text: { query: 'Fuji', path: 'description' } }],
        },
      },
    },
    { $project: { score: { $meta: 'searchScore' } } },
  ];
}

/**
 * minimumShouldMatch
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/compound/#minimumshouldmatch-example}
 */
function test2() {
  type TestCollection = {
    _id: number;
    type: string;
    description: string;
    category: string;
    in_stock: boolean;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    {
      $search: {
        compound: {
          must: [{ text: { query: 'varieties', path: 'description' } }],
          should: [
            { text: { query: 'Fuji', path: 'description' } },
            { text: { query: 'Golden Delicious', path: 'description' } },
          ],
          minimumShouldMatch: 1,
        },
      },
    },
  ];
}

/**
 * Filter
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/compound/#filter-examples}
 */
function test3() {
  type TestCollection = {
    _id: number;
    type: string;
    description: string;
    category: string;
    in_stock: boolean;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    {
      $search: {
        compound: {
          must: [{ text: { query: 'varieties', path: 'description' } }],
          should: [{ text: { query: 'banana', path: 'description' } }],
          filter: [{ text: { query: 'granny', path: 'description' } }],
        },
      },
    },
  ];
}

/**
 * Nested
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/compound/#nested-example}
 */
function test4() {
  type TestCollection = {
    _id: number;
    type: string;
    description: string;
    category: string;
    in_stock: boolean;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    {
      $search: {
        compound: {
          should: [
            { text: { query: 'apple', path: 'type' } },
            {
              compound: {
                must: [
                  { text: { query: 'organic', path: 'category' } },
                  { equals: { value: true, path: 'in_stock' } },
                ],
              },
            },
          ],
          minimumShouldMatch: 1,
        },
      },
    },
  ];
}
