/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Example
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/aggregation-stages/searchMeta/#example}
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
      $searchMeta: {
        range: { path: 'year', gte: 1998, lt: 1999 },
        count: { type: 'total' },
      },
    },
  ];
}

/**
 * Year Facet
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/facet/#example-1}
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
          operator: { range: { path: 'year', gte: 1980, lte: 2000 } },
          facets: {
            yearFacet: {
              type: 'number',
              path: 'year',
              boundaries: [1980, 1990, 2000],
              default: 'other',
            },
          },
        },
      },
    },
  ];
}

/**
 * Date Facet
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/facet/#example-2}
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
            range: {
              path: 'released',
              gte: new Date('2000-01-01T00:00:00.000Z'),
              lte: new Date('2015-01-31T00:00:00.000Z'),
            },
          },
          facets: {
            yearFacet: {
              type: 'date',
              path: 'released',
              boundaries: [
                new Date('2000-01-01T00:00:00.000Z'),
                new Date('2005-01-01T00:00:00.000Z'),
                new Date('2010-01-01T00:00:00.000Z'),
                new Date('2015-01-01T00:00:00.000Z'),
              ],
              default: 'other',
            },
          },
        },
      },
    },
  ];
}

/**
 * Metadata Results
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/facet/#examples}
 */
function test3() {
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
            range: {
              path: 'released',
              gte: new Date('2000-01-01T00:00:00.000Z'),
              lte: new Date('2015-01-31T00:00:00.000Z'),
            },
          },
          facets: {
            directorsFacet: {
              type: 'string',
              path: 'directors',
              numBuckets: 7,
            },
            yearFacet: {
              type: 'number',
              path: 'year',
              boundaries: [2000, 2005, 2010, 2015],
            },
          },
        },
      },
    },
  ];
}

/**
 * Autocomplete Bucket Results through Facet Queries
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/autocomplete/#bucket-results-through-facet-queries}
 */
function test4() {
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
          operator: { autocomplete: { path: 'title', query: 'Gravity' } },
          facets: { titleFacet: { type: 'string', path: 'title' } },
        },
      },
    },
  ];
}
