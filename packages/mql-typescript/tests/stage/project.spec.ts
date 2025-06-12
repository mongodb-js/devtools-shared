/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Include Specific Fields in Output Documents
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/project/#include-specific-fields-in-output-documents}
 */
function test0() {
  type books = {
    _id: number;
    title: string;
    isbn: string;
    author: {
      last: string;
      first: string;
    };
    copies: number;
  };

  const aggregation: schema.Pipeline<books> = [
    { $project: { title: 1, author: 1 } },
  ];
}

/**
 * Suppress id Field in the Output Documents
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/project/#suppress-_id-field-in-the-output-documents}
 */
function test1() {
  type books = {
    _id: number;
    title: string;
    isbn: string;
    author: {
      last: string;
      first: string;
    };
    copies: number;
  };

  const aggregation: schema.Pipeline<books> = [
    { $project: { _id: 0, title: 1, author: 1 } },
  ];
}

/**
 * Exclude Fields from Output Documents
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/project/#exclude-fields-from-output-documents}
 */
function test2() {
  type books = {
    _id: number;
    title: string;
    isbn: string;
    author: {
      last: string;
      first: string;
    };
    copies: number;
    lastModified: string;
  };

  const aggregation: schema.Pipeline<books> = [
    { $project: { lastModified: 0 } },
  ];
}

/**
 * Exclude Fields from Embedded Documents
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/project/#exclude-fields-from-embedded-documents}
 */
function test3() {
  type books = {
    _id: number;
    title: string;
    isbn: string;
    author: {
      last: string;
      first: string;
    };
    copies: number;
    lastModified: string;
  };

  const aggregation: schema.Pipeline<books> = [
    { $project: { 'author.first': 0, lastModified: 0 } },
    { $project: { author: { first: 0 }, lastModified: 0 } },
  ];
}

/**
 * Conditionally Exclude Fields
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/project/#conditionally-exclude-fields}
 */
function test4() {
  type books = {
    _id: number;
    title: string;
    isbn: string;
    author: {
      last: string;
      first: string;
      middle: string;
    };
    copies: number;
    lastModified: string;
  };

  const aggregation: schema.Pipeline<books> = [
    {
      $project: {
        title: 1,
        'author.first': 1,
        'author.last': 1,
        'author.middle': {
          $cond: {
            if: { $eq: ['', '$author.middle'] },
            then: '$$REMOVE',
            else: '$author.middle',
          },
        },
      },
    },
  ];
}

/**
 * Include Specific Fields from Embedded Documents
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/project/#include-specific-fields-from-embedded-documents}
 */
function test5() {
  type bookmarks = {
    _id: number;
    user: string;
    stop:
      | {
          title: string;
          author: string;
          page: number;
        }
      | Array<{
          title: string;
          author: string;
          page: number;
        }>;
  };

  const aggregation: schema.Pipeline<bookmarks> = [
    { $project: { 'stop.title': 1 } },
    { $project: { stop: { title: 1 } } },
  ];
}

/**
 * Include Computed Fields
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/project/#include-computed-fields}
 */
function test6() {
  type books = {
    _id: number;
    title: string;
    isbn: string;
    author: {
      last: string;
      first: string;
    };
    copies: number;
  };

  const aggregation: schema.Pipeline<books> = [
    {
      $project: {
        title: 1,
        isbn: {
          prefix: { $substr: ['$isbn', 0, 3] },
          group: { $substr: ['$isbn', 3, 2] },
          publisher: { $substr: ['$isbn', 5, 4] },
          title: { $substr: ['$isbn', 9, 3] },
          checkDigit: { $substr: ['$isbn', 12, 1] },
        },
        lastName: '$author.last',
        copiesSold: '$copies',
      },
    },
  ];
}

/**
 * Project New Array Fields
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/project/#project-new-array-fields}
 */
function test7() {
  type TestCollection = {
    _id: bson.ObjectId;
    x: number;
    y: number;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    { $project: { myArray: ['$x', '$y'] } },
  ];
}
