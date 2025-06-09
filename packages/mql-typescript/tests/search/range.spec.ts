/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Number gte lte
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/range/#number-example}
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
    { $search: { range: { path: 'runtime', gte: 2, lte: 3 } } },
    { $limit: 5 },
    { $project: { _id: 0, title: 1, runtime: 1 } },
  ];
}

/**
 * Number lte
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/range/#number-example}
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
    { $search: { range: { path: 'runtime', lte: 2 } } },
    { $limit: 5 },
    {
      $project: {
        _id: 0,
        title: 1,
        runtime: 1,
        score: { $meta: 'searchScore' },
      },
    },
  ];
}

/**
 * Date
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/range/#date-example}
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
        range: {
          path: 'released',
          gt: new Date('2010-01-01T00:00:00.000Z'),
          lt: new Date('2015-01-01T00:00:00.000Z'),
        },
      },
    },
    { $limit: 5 },
    { $project: { _id: 0, title: 1, released: 1 } },
  ];
}

/**
 * ObjectId
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/range/#objectid-example}
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
      $search: {
        range: {
          path: '_id',
          gte: bson.ObjectId.createFromHexString('573a1396f29313caabce4a9a'),
          lte: bson.ObjectId.createFromHexString('573a1396f29313caabce4ae7'),
        },
      },
    },
    { $project: { _id: 1, title: 1, released: 1 } },
  ];
}

/**
 * String
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/range/#string-example}
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
    { $search: { range: { path: 'title', gt: 'city', lt: 'country' } } },
    { $limit: 5 },
    { $project: { _id: 0, title: 1 } },
  ];
}
