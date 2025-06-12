/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Using Two $addFields Stages
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/addFields/#using-two--addfields-stages}
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
      $addFields: {
        totalHomework: { $sum: ['$homework'] },
        totalQuiz: { $sum: ['$quiz'] },
      },
    },

    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (it may involve a projected field).
     */
    {
      $addFields: {
        totalScore: { $add: ['$totalHomework', '$totalQuiz', '$extraCredit'] },
      },
    } as any,
  ];
}

/**
 * Adding Fields to an Embedded Document
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/addFields/#adding-fields-to-an-embedded-document}
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
    { $addFields: { 'specs.fuel_type': 'unleaded' } },
  ];
}

/**
 * Overwriting an existing field
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/addFields/#overwriting-an-existing-field}
 */
function test2() {
  type animals = {
    _id: number;
    dogs: number;
    cats: number;
  };

  const aggregation: schema.Pipeline<animals> = [{ $addFields: { cats: 20 } }];
}

/**
 * Add Element to an Array
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/addFields/#add-element-to-an-array}
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
    { $addFields: { homework: { $concatArrays: ['$homework', [7]] } } },
  ];
}
