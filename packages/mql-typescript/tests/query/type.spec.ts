import * as schema from '../../out/schema';
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
  type addressBook = {
    _id: number;
    address: string;
    zipCode: string | number | bson.Long | bson.Int32 | number | Array<string>;
  };

  const aggregation: schema.Pipeline<addressBook> = [
    { $match: { zipCode: { $type: ['minKey'] } } },
    { $match: { zipCode: { $type: ['maxKey'] } } },
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
