/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable filename-rules/match */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import type * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Querying by Data Type
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/type/#querying-by-data-type}
 */
function test0() {
  type addressBook = {
    _id: number;
    address: string;
    zipCode: string | number | bson.Long | bson.Int32 | number | Array<string>;
  };

  const aggregation: schema.Pipeline<addressBook> = [
    { $match: { zipCode: { $type: [2] } } },
    { $match: { zipCode: { $type: ['string'] } } },
    { $match: { zipCode: { $type: [1] } } },
    { $match: { zipCode: { $type: ['double'] } } },
    { $match: { zipCode: { $type: ['number'] } } },
  ];
}

/**
 * Querying by Multiple Data Type
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/type/#querying-by-multiple-data-types}
 */
function test1() {
  type grades = {
    _id: number;
    name: string;
    classAverage: string | number | bson.Int32 | number;
  };

  const aggregation: schema.Pipeline<grades> = [
    { $match: { classAverage: { $type: [2, 1] } } },
    { $match: { classAverage: { $type: ['string', 'double'] } } },
  ];
}

/**
 * Querying by MinKey and MaxKey
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/type/#querying-by-minkey-and-maxkey}
 */
function test2() {
  type restaurants = {
    _id: number;
    address: {
      building: string;
      coord: Array<number>;
      street: string;
      zipcode: string;
    };
    borough: string;
    cuisine: string;
    grades: Array<{
      date: Date;
      grade: string | bson.MinKey;
      score: number;
    }>;
    name: string;
    restaurant_id: string;
  };

  const aggregation: schema.Pipeline<restaurants> = [
    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (this test accesses nested fields, which is not currently supported).
     */
    { $match: { zipCode: { $type: ['minKey'] } } } as any,

    /**
     * This stage is unsupported by the static type system, so we're casting it to 'any' (this test accesses nested fields, which is not currently supported).
     */
    { $match: { zipCode: { $type: ['maxKey'] } } } as any,
  ];
}

/**
 * Querying by Array Type
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/type/#querying-by-array-type}
 */
function test3() {
  type sensorReading = {
    _id: number;
    readings: Array<number | Array<string | number>> | number;
  };

  const aggregation: schema.Pipeline<sensorReading> = [
    { $match: { readings: { $type: ['array'] } } },
  ];
}
