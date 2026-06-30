/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * with an Embedded Document Field
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/replaceRoot/#-replaceroot-with-an-embedded-document-field}
 */
function test0() {
  type TestCollection = {
    _id: number;
    name: string;
    age: number;
    pets: {
      dogs: number;
      cats: number;
      fish: number;
    };
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    {
      $replaceRoot: {
        newRoot: {
          $mergeObjects: [{ dogs: 0, cats: 0, birds: 0, fish: 0 }, '$pets'],
        },
      },
    },
  ];
}

/**
 * with a Document Nested in an Array
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/replaceRoot/#-replaceroot-with-a-document-nested-in-an-array}
 */
function test1() {
  type students = {
    _id: number;
    grades: Array<{
      test: number;
      grade: number;
      mean: number;
      std: number;
    }>;
  };

  const aggregation: schema.Pipeline<students> = [
    { $unwind: { path: '$grades' } },

    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (this test accesses nested fields, which is not currently supported).
     */
    { $match: { 'grades.grade': { $gte: 90 } } } as any,

    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (this test accesses nested fields, which is not currently supported).
     */
    { $replaceRoot: { newRoot: '$grades' } } as any,
  ];
}

/**
 * with a newly created document
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/replaceRoot/#-replaceroot-with-a-newly-created-document}
 */
function test2() {
  type TestCollection = {
    _id: number;
    first_name: string;
    last_name: string;
    city: string;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    {
      $replaceRoot: {
        newRoot: { full_name: { $concat: ['$first_name', ' ', '$last_name'] } },
      },
    },
  ];
}

/**
 * with a New Document Created from $$ROOT and a Default Document
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/replaceRoot/#-replaceroot-with-a-new-document-created-from---root-and-a-default-document}
 */
function test3() {
  type contacts = {
    _id: number;
    name: string;
    email: string;
    cell: string;
    home: string;
  };

  const aggregation: schema.Pipeline<contacts> = [
    {
      $replaceRoot: {
        newRoot: {
          $mergeObjects: [
            { _id: '', name: '', email: '', cell: '', home: '' },
            '$$ROOT',
          ],
        },
      },
    },
  ];
}
