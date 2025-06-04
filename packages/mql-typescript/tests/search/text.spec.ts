import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Basic
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/text/#basic-example}
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
    { $search: { text: { path: 'title', query: 'surfer' } } },
    { $project: { _id: 0, title: 1, score: { $meta: 'searchScore' } } },
  ];
}

/**
 * Fuzzy Default
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/text/#fuzzy-examples}
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
    { $search: { text: { path: 'title', query: 'naw yark', fuzzy: {} } } },
    { $limit: 10 },
    { $project: { _id: 0, title: 1, score: { $meta: 'searchScore' } } },
  ];
}

/**
 * Fuzzy maxExpansions
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/text/#fuzzy-examples}
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
        text: {
          path: 'title',
          query: 'naw yark',
          fuzzy: { maxEdits: 1, maxExpansions: 100 },
        },
      },
    },
    { $limit: 10 },
    { $project: { _id: 0, title: 1, score: { $meta: 'searchScore' } } },
  ];
}

/**
 * Fuzzy prefixLength
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/text/#fuzzy-examples}
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
        text: {
          path: 'title',
          query: 'naw yark',
          fuzzy: { maxEdits: 1, prefixLength: 2 },
        },
      },
    },
    { $limit: 8 },
    { $project: { _id: 1, title: 1, score: { $meta: 'searchScore' } } },
  ];
}

/**
 * Match any Using equivalent Mapping
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/text/#match-any-using-equivalent-mapping}
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
      $search: {
        text: {
          path: 'plot',
          query: 'attire',
          synonyms: 'my_synonyms',
          matchCriteria: 'any',
        },
      },
    },
    { $limit: 5 },
    {
      $project: { _id: 0, plot: 1, title: 1, score: { $meta: 'searchScore' } },
    },
  ];
}

/**
 * Match any Using explicit Mapping
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/text/#match-any-using-explicit-mapping}
 */
function test5() {
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
        text: {
          path: 'plot',
          query: 'boat race',
          synonyms: 'my_synonyms',
          matchCriteria: 'any',
        },
      },
    },
    { $limit: 10 },
    {
      $project: { _id: 0, plot: 1, title: 1, score: { $meta: 'searchScore' } },
    },
  ];
}

/**
 * Match all Using Synonyms
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/text/#match-all-using-synonyms}
 */
function test6() {
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
        text: {
          path: 'plot',
          query: 'automobile race',
          matchCriteria: 'all',
          synonyms: 'my_synonyms',
        },
      },
    },
    { $limit: 20 },
    {
      $project: { _id: 0, plot: 1, title: 1, score: { $meta: 'searchScore' } },
    },
  ];
}

/**
 * Wildcard Path
 * @see {@link https://www.mongodb.com/docs/atlas/atlas-search/text/}
 */
function test7() {
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
    { $search: { text: { path: { wildcard: '*' }, query: 'surfer' } } },
    { $project: { _id: 0, title: 1, score: { $meta: 'searchScore' } } },
  ];
}
