/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Single Document with Multiple Fields
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/morelikethis/#example-1--single-document-with-multiple-fields}
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
        moreLikeThis: { like: { title: 'The Godfather', genres: 'action' } },
      },
    },
    { $limit: 5 },
    { $project: { _id: 0, title: 1, released: 1, genres: 1 } },
  ];
}

/**
 * Input Document Excluded in Results
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/morelikethis/#example-2--input-document-excluded-in-results}
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
      $search: {
        compound: {
          must: [
            {
              moreLikeThis: {
                like: {
                  _id: bson.ObjectId.createFromHexString(
                    '573a1396f29313caabce4a9a',
                  ),
                  genres: ['Crime', 'Drama'],
                  title: 'The Godfather',
                },
              },
            },
          ],
          mustNot: [
            {
              equals: {
                path: '_id',
                value: bson.ObjectId.createFromHexString(
                  '573a1396f29313caabce4a9a',
                ),
              },
            },
          ],
        },
      },
    },
    { $limit: 5 },
    { $project: { _id: 1, title: 1, released: 1, genres: 1 } },
  ];
}

/**
 * Multiple Analyzers
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/morelikethis/#example-3--multiple-analyzers}
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
      $search: {
        compound: {
          should: [
            {
              moreLikeThis: {
                like: {
                  _id: bson.ObjectId.createFromHexString(
                    '573a1396f29313caabce4a9a',
                  ),
                  genres: ['Crime', 'Drama'],
                  title: 'The Godfather',
                },
              },
            },
          ],
          mustNot: [
            {
              equals: {
                path: '_id',
                value: bson.ObjectId.createFromHexString(
                  '573a1394f29313caabcde9ef',
                ),
              },
            },
          ],
        },
      },
    },
    { $limit: 10 },
    { $project: { title: 1, genres: 1, _id: 1 } },
  ];
}
