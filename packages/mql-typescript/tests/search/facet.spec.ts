/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
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

/**
 * Multi-Select Faceting Example
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/facet/#multi-select-faceting-example}
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
      $searchMeta: {
        facet: {
          operator: {
            compound: {
              must: [{ text: { path: 'description', query: 'new york city' } }],
              filter: [
                {
                  equals: {
                    path: 'cancellation_policy',
                    value: 'moderate',
                    doesNotAffect: 'cancellationFacet',
                  },
                },
              ],
            },
          },
          facets: {
            accommodatesFacet: {
              path: 'accommodates',
              type: 'number',
              boundaries: [1, 2, 4, 8],
            },
            cancellationFacet: { path: 'cancellation_policy', type: 'string' },
            roomTypeFacet: { path: 'room_type', type: 'string' },
          },
        },
      },
    },
  ];
}

/**
 * Inter-Facet Filter Exclusion Example
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/facet/#inter-facet-filter-exclusion-example}
 */
function test2() {
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
      $searchMeta: {
        facet: {
          operator: {
            compound: {
              must: [{ text: { path: 'description', query: 'new york city' } }],
              filter: [
                {
                  equals: {
                    path: 'cancellation_policy',
                    value: 'moderate',
                    doesNotAffect: 'accommodatesFacet',
                  },
                },
              ],
            },
          },
          facets: {
            accommodatesFacet: {
              path: 'accommodates',
              type: 'number',
              boundaries: [1, 2, 4, 8],
            },
            cancellationFacet: { path: 'cancellation_policy', type: 'string' },
            roomTypeFacet: { path: 'room_type', type: 'string' },
          },
        },
      },
    },
  ];
}
