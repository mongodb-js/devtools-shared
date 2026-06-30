/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/operators-collectors/hasAncestor/#sample-query}
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
              storedSource: {
                include: Array<string>;
              };
              type: string;
            }>;
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
        returnScope: { path: 'funding_rounds.investments' },
        hasAncestor: {
          ancestorPath: 'funding_rounds',
          operator: {
            equals: { path: 'funding_rounds.funded_year', value: 2005 },
          },
        },
      },
    } as any,
  ];
}
