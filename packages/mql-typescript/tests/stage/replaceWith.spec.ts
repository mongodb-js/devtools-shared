/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * an Embedded Document Field
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/replaceWith/#-replacewith-an-embedded-document-field}
 */
function test0() {
  type people = {
    _id: number;
    name: string;
    age: number;
    pets: {
      dogs: number;
      cats: number;
      fish: number;
    };
  };

  const aggregation: schema.Pipeline<people> = [
    {
      $replaceWith: {
        $mergeObjects: [{ dogs: 0, cats: 0, birds: 0, fish: 0 }, '$pets'],
      },
    },
  ];
}

/**
 * a Document Nested in an Array
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/replaceWith/#-replacewith-a-document-nested-in-an-array}
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
    { $replaceWith: '$grades' } as any,
  ];
}

/**
 * a Newly Created Document
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/replaceWith/#-replacewith-a-newly-created-document}
 */
function test2() {
  type sales = {
    _id: number;
    item: string;
    price: number;
    quantity: number;
    date: Date;
    status: string;
  };

  const aggregation: schema.Pipeline<sales> = [
    { $match: { status: 'C' } },
    {
      $replaceWith: {
        _id: '$_id',
        item: '$item',
        amount: { $multiply: ['$price', '$quantity'] },
        status: 'Complete',
        asofDate: '$$NOW',
      },
    },
  ];
}

/**
 * a New Document Created from $$ROOT and a Default Document
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/replaceWith/#-replacewith-a-new-document-created-from---root-and-a-default-document}
 */
function test3() {
  type contacts = {
    _id: number;
    name: string;
    email: string;
    cell: string;
  };

  const aggregation: schema.Pipeline<contacts> = [
    {
      $replaceWith: {
        $mergeObjects: [
          { _id: '', name: '', email: '', cell: '', home: '' },
          '$$ROOT',
        ],
      },
    },
  ];
}
