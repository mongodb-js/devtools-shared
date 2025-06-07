import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Search for a Single Word
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/text/#-text-with-a-single-word}
 */
function test0() {
  type articles = {
    _id: number;
    subject: string;
    author: string;
    views: number;
  };

  const aggregation: schema.Pipeline<articles> = [
    { $match: { $text: { $search: 'coffee' } } },
  ];
}

/**
 * Query a Different Language
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/text/#query-a-different-language}
 */
function test1() {
  type articles = {
    _id: number;
    subject: string;
    author: string;
    views: number;
  };

  const aggregation: schema.Pipeline<articles> = [
    { $match: { $text: { $search: 'leche', $language: 'es' } } },
  ];
}

/**
 * Case and Diacritic Insensitive Search
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/text/#case-and-diacritic-insensitivity}
 */
function test2() {
  type articles = {
    _id: number;
    subject: string;
    author: string;
    views: number;
  };

  const aggregation: schema.Pipeline<articles> = [
    { $match: { $text: { $search: 'сы́рники CAFÉS' } } },
  ];
}

/**
 * Perform Case Sensitive Search
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/text/#case-sensitivity}
 */
function test3() {
  type articles = {
    _id: number;
    subject: string;
    author: string;
    views: number;
  };

  const aggregation: schema.Pipeline<articles> = [
    { $match: { $text: { $search: 'Coffee', $caseSensitive: true } } },
    {
      $match: {
        $text: { $search: '\\"Café Con Leche\\"', $caseSensitive: true },
      },
    },
  ];
}

/**
 * Diacritic Sensitive Search
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/text/#diacritic-sensitivity}
 */
function test4() {
  type articles = {
    _id: number;
    subject: string;
    author: string;
    views: number;
  };

  const aggregation: schema.Pipeline<articles> = [
    { $match: { $text: { $search: 'CAFÉ', $diacriticSensitive: true } } },
  ];
}

/**
 * Text Search Score Examples
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/text/#relevance-score-examples}
 */
function test5() {
  type articles = {
    _id: number;
    subject: string;
    author: string;
    views: number;
  };

  const aggregation: schema.Pipeline<articles> = [
    { $match: { $text: { $search: 'CAFÉ', $diacriticSensitive: true } } },
    { $project: { score: { $meta: 'textScore' } } },
    { $sort: { score: { $meta: 'textScore' } } },
    { $limit: 5 },
  ];
}
