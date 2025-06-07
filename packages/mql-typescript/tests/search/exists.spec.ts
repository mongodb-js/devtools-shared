import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Basic
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/exists/#basic-example}
 */
function test0() {
  type TestCollection = {
    _id: number;
    type: string;
    description: string;
    quantities: {
      lemons: number;
      oranges: number;
      grapefruit: number;
    };
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    { $search: { exists: { path: 'type' } } },
  ];
}

/**
 * Embedded
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/exists/#embedded-example}
 */
function test1() {
  type TestCollection = {
    _id: number;
    type: string;
    description: string;
    quantities: {
      lemons: number;
      oranges: number;
      grapefruit: number;
    };
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (this test accesses nested fields, which is not currently supported).
     */
    { $search: { exists: { path: 'quantities.lemons' } } } as any,
  ];
}

/**
 * Compound
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/exists/#compound-example}
 */
function test2() {
  type TestCollection = {
    _id: number;
    type: string;
    description: string;
    quantities: {
      lemons: number;
      oranges: number;
      grapefruit: number;
    };
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    {
      $search: {
        compound: {
          must: [
            { exists: { path: 'type' } },
            { text: { query: 'apple', path: 'type' } },
          ],
          should: { text: { query: 'fuji', path: 'description' } },
        },
      },
    },
  ];
}
