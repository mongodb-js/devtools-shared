import * as schema from '../../out/schema';
import * as bson from 'bson';

/**
 * Bit Position Array
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/bitsAnyClear/#bit-position-array}
 */
function test0() {
  type collection = {
    _id: number;
    a: number | bson.Binary;
    binaryValueofA: string;
  };

  const aggregation: schema.Pipeline<collection> = [
    { $match: { a: { $bitsAnyClear: [1, 5] } } },
  ];
}

/**
 * Integer Bitmask
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/bitsAnyClear/#integer-bitmask}
 */
function test1() {
  type collection = {
    _id: number;
    a: number | bson.Binary;
    binaryValueofA: string;
  };

  const aggregation: schema.Pipeline<collection> = [
    { $match: { a: { $bitsAnyClear: 35 } } },
  ];
}

/**
 * BinData Bitmask
 * @see {@link https://www.mongodb.com/docs/manual/reference/operator/query/bitsAnyClear/#bindata-bitmask}
 */
function test2() {
  type collection = {
    _id: number;
    a: number | bson.Binary;
    binaryValueofA: string;
  };

  const aggregation: schema.Pipeline<collection> = [
    {
      $match: { a: { $bitsAnyClear: bson.Binary.createFromBase64('MA==', 0) } },
    },
  ];
}
