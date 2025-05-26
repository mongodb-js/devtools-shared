import * as schema from '../../out/schema';

import * as bson from 'bson';

/**
 * Usage Example
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/function/#example-1--usage-example}
 */
function test0() {
  type players = {
    _id: number;
    name: string;
    scores: Array<number>;
  };

  const aggregation: schema.Pipeline<players> = [
    {
      $addFields: {
        isFound: {
          $function: {
            body: 'function(name) {    return hex_md5(name) == "15b0a220baa16331e8d80e15367677ad"}',
            args: ['$name'],
            lang: 'js',
          },
        },
        message: {
          $function: {
            body: 'function(name, scores) {    let total = Array.sum(scores);    return `Hello ${name}. Your total score is ${total}.`}',
            args: ['$name', '$scores'],
            lang: 'js',
          },
        },
      },
    },
  ];
}

/**
 * Alternative to $where
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/function/#example-2--alternative-to--where}
 */
function test1() {
  type players = {
    _id: number;
    name: string;
    scores: Array<number>;
  };

  const aggregation: schema.Pipeline<players> = [
    {
      $match: {
        $expr: {
          $function: {
            body: 'function(name) {    return hex_md5(name) == "15b0a220baa16331e8d80e15367677ad";}',
            args: ['$name'],
            lang: 'js',
          },
        },
      },
    },
  ];
}
