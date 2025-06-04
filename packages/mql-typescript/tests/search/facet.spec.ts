import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Facet
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/facet/#examples}
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
        facet: {
          operator: {
            near: {
              path: 'released',
              origin: new Date('1999-07-01T00:00:00.000Z'),
              pivot: 7776000000,
            },
          },
          facets: { genresFacet: { type: 'string', path: 'genres' } },
        },
      },
    },
    { $limit: 2 },

    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (this uses $$SEARCH_META, which is a synthetic field not available statically).
     */
    {
      $facet: {
        docs: [{ $project: { title: 1, released: 1 } }],
        meta: [{ $replaceWith: '$$SEARCH_META' }, { $limit: 1 }],
      },
    } as any,

    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (this uses $$SEARCH_META, which is a synthetic field not available statically).
     */
    { $set: { meta: { $arrayElemAt: ['$meta', 0] } } } as any,
  ];
}
