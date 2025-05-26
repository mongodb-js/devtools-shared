import * as schema from '../../out/schema';

import * as bson from 'bson';

/**
 * Add to Each Element of an Array
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/map/#add-to-each-element-of-an-array}
 */
function test0() {
  type grades = {
    quizzes: Array<number>;
  };

  const aggregation: schema.Pipeline<grades> = [
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
  type deliveries = {
    city: string;
    distances: Array<number>;
  };

  const aggregation: schema.Pipeline<deliveries> = [
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
  type temperatures = {
    date: Date;
    tempsC: Array<number>;
  };

  const aggregation: schema.Pipeline<temperatures> = [
    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' ($map references the variable names defined in the `as` field, which is not available statically).
     */
    {
      $addFields: {
        tempsF: {
          $map: {
            input: '$tempsC',
            as: 'tempInCelsius',
            in: { $add: [{ $multiply: ['$$tempInCelsius', 1.8] }, 32] },
          },
        },
      },
    } as any,
  ];
}
