/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Simple Query
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/operators-collectors/hasRoot/#simple-query}
 */
function test0() {
  type TestCollection = {
    mappings: {
      dynamic: boolean;
      fields: {
        funding_rounds: {
          dynamic: boolean;
          fields: {
            investments: Array<{
              dynamic: boolean;
              type: string;
            }>;
          };
          storedSource: {
            include: Array<string>;
          };
          type: string;
        };
        products: {
          dynamic: boolean;
          storedSource: {
            include: Array<string>;
          };
          type: string;
        };
      };
    };
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (this test accesses nested fields, which is not currently supported).
     */
    {
      $search: {
        returnStoredSource: true,
        returnScope: { path: 'products' },
        hasRoot: {
          operator: { range: { path: 'founded_year', gte: 2005, lte: 2010 } },
        },
      },
    } as any,
  ];
}

/**
 * Multi-Level Query
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/operators-collectors/hasRoot/#multi-level-query}
 */
function test1() {
  type TestCollection = {
    mappings: {
      dynamic: boolean;
      fields: {
        funding_rounds: {
          dynamic: boolean;
          fields: {
            investments: Array<{
              dynamic: boolean;
              type: string;
            }>;
          };
          storedSource: {
            include: Array<string>;
          };
          type: string;
        };
        products: {
          dynamic: boolean;
          storedSource: {
            include: Array<string>;
          };
          type: string;
        };
      };
    };
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (this test accesses nested fields, which is not currently supported).
     */
    {
      $search: {
        returnStoredSource: true,
        returnScope: { path: 'funding_rounds' },
        hasRoot: { operator: { text: { path: 'name', query: 'Facebook' } } },
      },
    } as any,
  ];
}

/**
 * Compound Query
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/operators-collectors/hasRoot/#compound-query}
 */
function test2() {
  type TestCollection = {
    mappings: {
      dynamic: boolean;
      fields: {
        funding_rounds: {
          dynamic: boolean;
          fields: {
            investments: Array<{
              dynamic: boolean;
              type: string;
            }>;
          };
          storedSource: {
            include: Array<string>;
          };
          type: string;
        };
        products: {
          dynamic: boolean;
          storedSource: {
            include: Array<string>;
          };
          type: string;
        };
      };
    };
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (this test accesses nested fields, which is not currently supported).
     */
    {
      $search: {
        compound: {
          should: [
            {
              embeddedDocument: {
                path: 'funding_rounds.investments',
                operator: {
                  wildcard: {
                    path: 'funding_rounds.investments.financial_org.name',
                    query: '*Ventures*',
                    allowAnalyzedField: true,
                  },
                },
              },
            },
            {
              hasRoot: {
                operator: {
                  wildcard: {
                    path: 'description',
                    query: '*network*',
                    allowAnalyzedField: true,
                  },
                },
              },
            },
          ],
        },
        returnScope: { path: 'funding_rounds' },
        returnStoredSource: true,
      },
    } as any,

    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (this test accesses nested fields, which is not currently supported).
     */
    { $limit: 5 } as any,
  ];
}
