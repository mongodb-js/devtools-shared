/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Add to Each Element of an Array
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/map/#add-to-each-element-of-an-array}
 */
function test0() {
  type TestCollection = {
    theaterId: number;
    adjustedCoordinates: Array<number>;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' ($map references the variable names defined in the `as` field, which is not available statically).
     */
    {
      $project: {
        adjustedGrades: {
          $map: {
            input: '$quizzes',
            as: 'grade',
            in: { $add: ['$$grade', 2] },
          },
        },
      },
    } as any,
  ];
}

/**
 * Truncate Each Array Element
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/map/#truncate-each-array-element}
 */
function test1() {
  type TestCollection = {
    theaterId: number;
    adjustedCoordinates: Array<number>;
  };

  const aggregation: schema.Pipeline<TestCollection> = [
    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' ($map references the variable names defined in the `as` field, which is not available statically).
     */
    {
      $project: {
        city: '$city',
        integerValues: {
          $map: {
            input: '$distances',
            as: 'decimalValue',
            in: { $trunc: ['$$decimalValue'] },
          },
        },
      },
    } as any,
  ];
}

/**
 * Convert Celsius Temperatures to Fahrenheit
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/map/#convert-celsius-temperatures-to-fahrenheit}
 */
function test2() {
  // TODO: no schema found for map.Convert Celsius Temperatures to Fahrenheit: // TODO: No schema found in docs
}

/**
 * Use Array Index
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/map/}
 */
function test3() {
  // TODO: no schema found for map.Use Array Index: // TODO: No schema found in docs
}
