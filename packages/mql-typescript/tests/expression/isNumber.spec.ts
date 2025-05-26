import * as schema from '../../out/schema';

import * as bson from 'bson';

/**
 * Use $isNumber to Check if a Field is Numeric
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/isNumber/#use--isnumber-to-check-if-a-field-is-numeric}
 */
function test0() {
  type sensors = {
    _id: number;
    reading:
      | bson.Decimal128
      | bson.Long
      | bson.Int32
      | number
      | string
      | Array<bson.Decimal128>;
  };

  const aggregation: schema.Pipeline<sensors> = [
    {
      $addFields: {
        isNumber: { $isNumber: '$reading' },
        hasType: { $type: '$reading' },
      },
    },
  ];
}

/**
 * Conditionally Modify Fields using $isNumber
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/aggregation/isNumber/#conditionally-modify-fields-using--isnumber}
 */
function test1() {
  type grades = {
    student_id: number;
    class_id: string;
    class_desc: string;
    grade: string | number;
  };

  const aggregation: schema.Pipeline<grades> = [
    {
      $addFields: {
        points: {
          $cond: {
            if: { $isNumber: '$grade' },
            then: '$grade',
            else: {
              $switch: {
                branches: [
                  { case: { $eq: ['$grade', 'A'] }, then: 4 },
                  { case: { $eq: ['$grade', 'B'] }, then: 3 },
                  { case: { $eq: ['$grade', 'C'] }, then: 2 },
                  { case: { $eq: ['$grade', 'D'] }, then: 1 },
                  { case: { $eq: ['$grade', 'F'] }, then: 0 },
                ],
              },
            },
          },
        },
      },
    },
    { $group: { _id: '$student_id', GPA: { $avg: '$points' } } },
  ];
}
