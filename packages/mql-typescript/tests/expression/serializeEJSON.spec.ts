/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Canonical Extended JSON Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/serializeEJSON/#canonical-extended-json-example}
 */
function test0() {
  type TestCollection = {
    _id: bson.ObjectId;
    ejson: {
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
      cast: Array<string>;
      genres: Array<string>;
      directors: Array<string>;
    };
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    { $match: { title: 'Inception' } },
    { $project: { ejson: { $serializeEJSON: { input: '$$ROOT' } } } },
  ];
}

/**
 * Relaxed Extended JSON Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/serializeEJSON/#relaxed-extended-json-example}
 */
function test1() {
  type TestCollection = {
    _id: bson.ObjectId;
    ejson: {
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
      cast: Array<string>;
      genres: Array<string>;
      directors: Array<string>;
    };
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    { $match: { title: 'Inception' } },
    {
      $project: {
        ejson: { $serializeEJSON: { input: '$$ROOT', relaxed: true } },
      },
    },
  ];
}

/**
 * Convert to JSON String
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/serializeEJSON/#convert-to-json-string}
 */
function test2() {
  type TestCollection = {
    _id: bson.ObjectId;
    ejson: {
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
      cast: Array<string>;
      genres: Array<string>;
      directors: Array<string>;
    };
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    { $match: { title: 'The Godfather' } },
    {
      $project: {
        title: 1,
        jsonString: { $toString: { $serializeEJSON: { input: '$$ROOT' } } },
      },
    },
  ];
}

/**
 * Serialize Specific Fields
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/serializeEJSON/#serialize-specific-fields}
 */
function test3() {
  type TestCollection = {
    _id: bson.ObjectId;
    ejson: {
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
      cast: Array<string>;
      genres: Array<string>;
      directors: Array<string>;
    };
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    { $match: { year: { $gte: 2010 } } },
    {
      $project: {
        title: 1,
        metadataEJSON: {
          $serializeEJSON: {
            input: {
              releaseDate: '$released',
              runtime: '$runtime',
              imdbRating: '$imdb.rating',
            },
          },
        },
      },
    },
  ];
}

/**
 * Use onError for Error Handling
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/serializeEJSON/#use-onerror-for-error-handling}
 */
function test4() {
  type TestCollection = {
    _id: bson.ObjectId;
    ejson: {
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
      cast: Array<string>;
      genres: Array<string>;
      directors: Array<string>;
    };
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    {
      $project: {
        title: 1,
        ejson: {
          $serializeEJSON: {
            input: '$customField',
            onError: { error: 'Serialization failed' },
          },
        },
      },
    },
  ];
}
