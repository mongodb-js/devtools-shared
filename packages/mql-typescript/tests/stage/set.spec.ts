/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Using Two $set Stages
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/set/#using-two--set-stages}
 */
function test0() {
  type scores = {
    _id: number;
    student: string;
    homework: Array<number>;
    quiz: Array<number>;
    extraCredit: number;
  };

  const aggregation: schema.Pipeline<scores> = [
    {
      $set: {
        totalHomework: { $sum: ['$homework'] },
        totalQuiz: { $sum: ['$quiz'] },
      },
    },

    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (second $set stage references fields created in the first).
     */
    {
      $set: {
        totalScore: { $add: ['$totalHomework', '$totalQuiz', '$extraCredit'] },
      },
    } as any,
  ];
}

/**
 * Adding Fields to an Embedded Document
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/set/#adding-fields-to-an-embedded-document}
 */
function test1() {
  type vehicles = {
    _id: number;
    type: string;
    specs: {
      doors: number;
      wheels: number;
    };
  };

  const aggregation: schema.Pipeline<vehicles> = [
    { $set: { 'specs.fuel_type': 'unleaded' } },
  ];
}

/**
 * Overwriting an existing field
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/set/#overwriting-an-existing-field}
 */
function test2() {
  type animals = {
    _id: number;
    dogs: number;
    cats: number;
  };

  const aggregation: schema.Pipeline<animals> = [{ $set: { cats: 20 } }];
}

/**
 * Add Element to an Array
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/set/#add-element-to-an-array}
 */
function test3() {
  type scores = {
    _id: number;
    student: string;
    homework: Array<number>;
    quiz: Array<number>;
    extraCredit: number;
  };

  const aggregation: schema.Pipeline<scores> = [
    { $match: { _id: 1 } },
    { $set: { homework: { $concatArrays: ['$homework', [7]] } } },
  ];
}

/**
 * Creating a New Field with Existing Fields
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/set/#creating-a-new-field-with-existing-fields}
 */
function test4() {
  type scores = {
    _id: number;
    student: string;
    homework: Array<number>;
    quiz: Array<number>;
    extraCredit: number;
  };

  const aggregation: schema.Pipeline<scores> = [
    { $set: { quizAverage: { $avg: '$quiz' } } },
  ];
}
