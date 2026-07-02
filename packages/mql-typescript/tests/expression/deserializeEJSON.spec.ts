/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Deserialize Extended JSON Document
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/deserializeEJSON/#deserialize-extended-json-document}
 */
function test0() {
  type movies = {
    _id: bson.ObjectId;
    title: string;
    year: bson.Int32 | number;
    runtime: bson.Int32 | number;
    released: Date;
    cast: unknown[];
    genres: unknown[];
    directors: unknown[];
  };

  const aggregation: schema.Pipeline<movies> = [
    { $match: { title: 'Inception' } },
    {
      $project: {
        original: '$$ROOT',
        serialized: { $serializeEJSON: { input: '$$ROOT' } },
      },
    },
    {
      $project: {
        title: '$original.title',
        deserialized: { $deserializeEJSON: { input: '$serialized' } },
      },
    },
  ];
}

/**
 * Parse JSON String and Deserialize
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/deserializeEJSON/#parse-json-string-and-deserialize}
 */
function test1() {
  type TestCollection = {
    jsonData: string;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    {
      $documents: [
        {
          jsonData:
            '{"_id":{"$oid":"507f1f77bcf86cd799439011"},"title":"The Matrix","year":{"$numberInt":"1999"},"rating":{"$numberDouble":"8.7"}}',
        },
      ],
    },
    {
      $project: { parsed: { $convert: { input: '$jsonData', to: 'object' } } },
    },
    { $project: { movie: { $deserializeEJSON: { input: '$parsed' } } } },
  ];
}

/**
 * Deserialize Specific Fields
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/deserializeEJSON/#deserialize-specific-fields}
 */
function test2() {
  type movies = {
    _id: bson.ObjectId;
    title: string;
    released: Date;
    runtime: bson.Int32 | number;
    imdb: {
      rating: bson.Double | number;
    };
  };

  const aggregation: schema.Pipeline<movies> = [
    { $match: { title: 'Inception' } },
    {
      $project: {
        title: 1,
        serializedMetadata: {
          $serializeEJSON: {
            input: {
              releaseDate: '$released',
              runtime: '$runtime',
              rating: '$imdb.rating',
            },
          },
        },
      },
    },
    {
      $project: {
        title: 1,
        metadata: { $deserializeEJSON: { input: '$serializedMetadata' } },
      },
    },
  ];
}

/**
 * Use onError for Error Handling
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/deserializeEJSON/#use-onerror-for-error-handling}
 */
function test3() {
  type data = {
    _id: bson.ObjectId;
    ejsonField: string;
  };

  const aggregation: schema.Pipeline<data> = [
    {
      $project: {
        result: {
          $deserializeEJSON: {
            input: '$ejsonField',
            onError: { error: 'Invalid EJSON format' },
          },
        },
      },
    },
  ];
}
