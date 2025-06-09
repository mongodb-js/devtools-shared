/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Boolean Operator Queries
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/queryString/#boolean-operator-queries}
 */
function test0() {
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
      $search: {
        queryString: {
          defaultPath: 'title',
          query: 'Rocky AND (IV OR 4 OR Four)',
        },
      },
    },
    { $project: { _id: 0, title: 1 } },
  ];
}
