import * as bson from 'bson';
import { ParseMode } from '../src';
import type { Options } from '../src/options';

export type ParseTestCase = {
  title: string;
  input: string;
  expected: unknown;
  options?: Partial<Options>;
};

const functionCallOptions: Partial<Options> = {
  mode: ParseMode.Strict,
  allowMethods: true,
};

const commentsTemplate = `{
    this: 'is', // a test
    to: 'see' /* if comments work as expected */
  }`;

export const PARSE_TEST_CASES: ParseTestCase[] = [
  {
    title: 'should correctly parse a valid object',
    input: '{_id:"hello"}',
    expected: { _id: 'hello' },
  },
  {
    title: 'should accept a complex query',
    input: `{
    RegExp: /test/ig,
    Binary: new Binary(),
    BinData: BinData(3, 'dGVzdAo='),
    LegacyCSharpUUID: LegacyCSharpUUID('00112233-4455-6677-8899-aabbccddeeff'),
    LegacyJavaUUID: LegacyJavaUUID('00112233-4455-6677-8899-aabbccddeeff'),
    LegacyPythonUUID: LegacyPythonUUID('00112233-4455-6677-8899-aabbccddeeff'),
    UUID: UUID('3d37923d-ab8e-4931-9e46-93df5fd3599e'),
    Code: Code('function() {}'),
    DBRef: new DBRef('tests', new ObjectId("5e159ba7eac34211f2252aaa"), 'test'),
    Decimal128: new Decimal128("128"),
    NumberDecimal: NumberDecimal("12345"),
    Double: Double(10.1),
    Int32: new Int32(10),
    NumberInt: NumberInt("100"),
    Long: new Long(234, 200),
    NumberLong: NumberLong(123456789),
    Int64: new Int64(120),
    Map: Map([['key', 'value']]),
    MaxKey: MaxKey(),
    MinKey: MinKey(),
    ObjectID: ObjectID("5e159ba7eac34211f2252aaa"),
    ObjectId: ObjectId("5e159ba7eac34211f2252aaa"),
    Symbol: Symbol('symbol'),
    Timestamp: Timestamp(100, 0),
    Timestamp_object: Timestamp({ t: 1, i: 2 }),
    Timestamp_long: Timestamp(new Long(1, 2)),
    ISODate: ISODate("2020-01-01 12:00:00"),
    Date: new Date("2020-01-01 12:00:00")
  }`,
    expected: {
      RegExp: /test/gi,
      Binary: new bson.Binary(),
      BinData: new bson.Binary(Buffer.from('dGVzdAo=', 'base64'), 3),
      LegacyCSharpUUID: new bson.Binary(
        Buffer.from('33221100554477668899aabbccddeeff', 'hex'),
        3,
      ),
      LegacyJavaUUID: new bson.Binary(
        Buffer.from('7766554433221100ffeeddccbbaa9988', 'hex'),
        3,
      ),
      LegacyPythonUUID: new bson.Binary(
        Buffer.from('00112233445566778899aabbccddeeff', 'hex'),
        3,
      ),
      UUID: new bson.Binary(
        Buffer.from('3d37923dab8e49319e4693df5fd3599e', 'hex'),
        4,
      ),
      Code: new bson.Code('function() {}'),
      DBRef: new bson.DBRef(
        'tests',
        new bson.ObjectId('5e159ba7eac34211f2252aaa'),
        'test',
      ),
      Decimal128: bson.Decimal128.fromString('128'),
      NumberDecimal: bson.Decimal128.fromString('12345'),
      Double: new bson.Double(10.1),
      Int32: new bson.Int32(10),
      NumberInt: new bson.Int32(100),
      Long: new bson.Long(234, 200),
      NumberLong: bson.Long.fromNumber(123456789),
      Int64: bson.Long.fromNumber(120),
      Map: new Map([['key', 'value']]),
      MaxKey: new bson.MaxKey(),
      MinKey: new bson.MinKey(),
      ObjectID: new bson.ObjectId('5e159ba7eac34211f2252aaa'),
      ObjectId: new bson.ObjectId('5e159ba7eac34211f2252aaa'),
      Symbol: new (bson as any).BSONSymbol('symbol'),
      Timestamp: new bson.Timestamp({ t: 100, i: 0 }),
      Timestamp_object: new bson.Timestamp({ t: 1, i: 2 }),
      Timestamp_long: new bson.Timestamp(bson.Long.fromNumber(8589934593)),
      ISODate: new Date('2020-01-01T12:00:00.000Z'),
      Date: new Date('2020-01-01 12:00:00'),
    },
  },
  {
    title: 'should keep BSON values nested inside Map',
    input: `{ m: Map([['oid', ObjectId("5e159ba7eac34211f2252aaa")], ['long', NumberLong(5)]]) }`,
    expected: {
      m: new Map<string, unknown>([
        ['oid', new bson.ObjectId('5e159ba7eac34211f2252aaa')],
        ['long', bson.Long.fromNumber(5)],
      ]),
    },
  },
  {
    title: 'should accept an empty object',
    input: '{ }',
    expected: {},
  },
  {
    title: 'should parse special globals / values',
    input: `{
    infinity: Infinity,
    NaN: NaN,
    undefined: undefined,
    null: null
  }`,
    expected: {
      infinity: Infinity,
      NaN: NaN,
      undefined: undefined,
      null: null,
    },
  },
  {
    title:
      'should accept Binary.createFromHexString and Binary.createFromBase64 when allowMethods is true',
    input: `{
        BinaryCreateFromHexString: Binary.createFromHexString('deadbeef'),
        BinaryCreateFromBase64: Binary.createFromBase64('3q2+7w=='),
        }`,
    options: { allowMethods: true },
    expected: {
      BinaryCreateFromHexString: new bson.Binary(
        Buffer.from('deadbeef', 'hex'),
        0,
      ),
      BinaryCreateFromBase64: new bson.Binary(
        Buffer.from('3q2+7w==', 'base64'),
        0,
      ),
    },
  },
  {
    title: 'should support binary operators (like plus / minus)',
    input: `{
    _id: ObjectId("5e159ba7eac34211f2252aaa"),
    created: Timestamp(10 + 10, 10),
    filter: { year: { $gte: 2021 - (1/2 + 0.5 - (5 * 0)) } },
  }`,
    expected: {
      _id: new bson.ObjectId('5e159ba7eac34211f2252aaa'),
      created: new bson.Timestamp({ i: 10, t: 20 }),
      filter: { year: { $gte: 2020 } },
    },
  },
  {
    title: 'should support parsing array operators',
    input: `[{
    "$match": {
      "released": {
        "$gte": {
          "$date": {
            "$numberLong": "-1806710400000"
          }
        }
      }
    }
  },
  {
    "$group": {
      "_id": {
        "__alias_0": "$year"
      },
      "__alias_1": {
        "$sum": 1
      }
    }
  }]`,
    expected: [
      {
        $match: {
          released: {
            $gte: {
              $date: {
                $numberLong: '-1806710400000',
              },
            },
          },
        },
      },
      {
        $group: {
          _id: {
            __alias_0: '$year',
          },
          __alias_1: {
            $sum: 1,
          },
        },
      },
    ],
  },
  {
    title: 'should not allow calling functions that do not exist',
    input: '{ date: require("") }',
    expected: '',
  },

  // Flattened from a loop over ParseMode.{Extended,Strict,Loose}, each
  // asserting 4 separate expressions.
  ...[ParseMode.Extended, ParseMode.Strict, ParseMode.Loose].flatMap(
    (mode): ParseTestCase[] => [
      {
        title: `should not allow calling functions that only exist as Object.prototype properties (mode=${mode}) - Date.constructor`,
        input: '{ date: Date.constructor("") }',
        options: { mode },
        expected: '',
      },
      {
        title: `should not allow calling functions that only exist as Object.prototype properties (mode=${mode}) - Date.hasOwnProperty`,
        input: '{ date: Date.hasOwnProperty("") }',
        options: { mode },
        expected: '',
      },
      {
        title: `should not allow calling functions that only exist as Object.prototype properties (mode=${mode}) - Date.__proto__`,
        input: '{ date: Date.__proto__("") }',
        options: { mode },
        expected: '',
      },
      {
        title: `should not allow calling functions that only exist as Object.prototype properties (mode=${mode}) - Code({ toString })`,
        input: '{ date: Code({ toString: Date.constructor("throw null;") }) }',
        options: { mode },
        expected: '',
      },
    ],
  ),

  {
    title:
      'Function calls > Should deny calls if functions are not allowed - reject calls to Math',
    input: '{ floor: Math.floor(5.5) }',
    options: { mode: ParseMode.Strict, allowMethods: false },
    expected: '',
  },

  // Flattened from a loop over dateFn, each a single "reject calls" case.
  ...['new Date', 'new ISODate', 'Date', 'ISODate'].map(
    (dateFn): ParseTestCase => ({
      title: `Function calls > Should deny calls if functions are not allowed > Prevent calling function calls on "${dateFn}" - reject calls`,
      input: `{ date: (${dateFn}(0)).getFullYear() }`,
      options: { mode: ParseMode.Strict, allowMethods: false },
      expected: '',
    }),
  ),

  {
    title:
      'Function calls > Math - should allow parsing while using functions from Math',
    input: `{
          abs: Math.abs(-10),
          acos: Math.acos(1),
          acosh: Math.acosh(2),
          asin: Math.asin(1),
          asinh: Math.asinh(1),
          atan: Math.atan(1),
          atan2: Math.atan2(2, 5),
          atanh: Math.atanh(0.5),
          cbrt: Math.cbrt(64),
          ceil: Math.ceil(5.5),
          clz32: Math.clz32(1000),
          cos: Math.cos(0.5),
          cosh: Math.cosh(0.5),
          exp: Math.exp(2),
          expm1: Math.expm1(2),
          floor: Math.floor(5.5),
          fround: Math.fround(5.05),
          hypot: Math.hypot(5, 12),
          imul: Math.imul(3, 4),
          log: Math.log(8),
          log10: Math.log10(100),
          log1p: Math.log1p(1),
          log2: Math.log2(8),
          max: Math.max(1, 2, 3),
          min: Math.min(1, 2, 3),
          pow: Math.pow(2, 3),
          round: Math.round(-5.5),
          sign: Math.sign(-10),
          sin: Math.sin(0.5),
          sinh: Math.sinh(0.5),
          sqrt: Math.sqrt(81),
          tan: Math.tan(1),
          tanh: Math.tanh(1),
          trunc: Math.trunc(30.5),
        }`,
    options: functionCallOptions,
    expected: {
      abs: 10,
      acos: Math.acos(1),
      acosh: Math.acosh(2),
      asin: Math.asin(1),
      asinh: Math.asinh(1),
      atan: Math.atan(1),
      atan2: Math.atan2(2, 5),
      atanh: Math.atanh(0.5),
      cbrt: 4,
      ceil: 6,
      clz32: 22,
      cos: Math.cos(0.5),
      cosh: Math.cosh(0.5),
      exp: Math.exp(2),
      expm1: Math.expm1(2),
      floor: 5,
      fround: Math.fround(5.05),
      hypot: 13,
      imul: 12,
      log: Math.log(8),
      log10: 2,
      log1p: Math.log1p(1),
      log2: 3,
      max: 3,
      min: 1,
      pow: 8,
      round: -5,
      sign: -1,
      sin: Math.sin(0.5),
      sinh: Math.sinh(0.5),
      sqrt: 9,
      tan: Math.tan(1),
      tanh: Math.tanh(1),
      trunc: 30,
    },
  },
  {
    title: 'Function calls > Math - should be able to handle math expressions',
    input: '{ simpleCalc: (5 * Math.floor(5.5) + Math.ceil(5.5)) }',
    options: functionCallOptions,
    expected: { simpleCalc: 31 },
  },
  {
    title: 'Function calls > Math - should prevent invalid functions',
    input: '{ simpleCalc: Math.totallyLegit(5) }',
    options: functionCallOptions,
    expected: '',
  },
  {
    title:
      'Function calls > Function expressions - should allow functions as object properties',
    input: '{ $where: function() { this.x = 1 }}',
    options: functionCallOptions,
    expected: { $where: 'function() { this.x = 1 }' },
  },
  {
    title:
      'Function calls > Function expressions - should not allow functions outside object properties',
    input: 'function() { this.x = 1 }',
    options: functionCallOptions,
    expected: '',
  },
  {
    title:
      'Function calls > Function expressions - should allow multiline functions',
    input: '{ $where: function\n()\n{\nthis.x = 1\n}}',
    options: functionCallOptions,
    expected: { $where: 'function\n()\n{\nthis.x = 1\n}' },
  },
  {
    title:
      'Function calls > Function expressions - should allow arrow functions',
    input: '{ $where: () => true }',
    options: functionCallOptions,
    expected: { $where: '() => true' },
  },
  {
    // Note: the original test calls `parse(input)` with no options, unlike
    // its sibling tests in this describe block.
    title: 'Function calls > Function expressions - should allow $expr queries',
    input: `{
        $expr: {
          $function: {
            body: function(name) { return hex_md5(name) == "15b0a220baa16331e8d80e15367677ad"; },
            args: [ "$name" ],
            lang: "js"
          }
        }
      }`,
    expected: {
      $expr: {
        $function: {
          body: 'function(name) { return hex_md5(name) == "15b0a220baa16331e8d80e15367677ad"; }',
          args: ['$name'],
          lang: 'js',
        },
      },
    },
  },

  // Flattened from a loop of [input, result] pairs.
  ...(
    [
      [
        '{ dayOfYear: Math.round((new Date(1578974885017).setHours(23) - new Date(new Date(1578974885017).getYear()+1900, 0, 1, 0, 0, 0))/1000/60/60/24)}',
        { dayOfYear: 14 },
      ],
      [
        '{ _id: { $gte: ObjectId(Math.floor((new Date(1578974885017)).setSeconds(-2592000)/1000).toString(16)+"0000000000000000")}, event: "passing_tests"}',
        {
          _id: { $gte: new bson.ObjectId('5df5b1a00000000000000000') },
          event: 'passing_tests',
        },
      ],
    ] as const
  ).map(
    ([input, result]): ParseTestCase => ({
      title: `Function calls > complicated parsing of Math and Date - should parse ${input} as ${JSON.stringify(
        result,
      )}`,
      input,
      options: functionCallOptions,
      expected: result,
    }),
  ),

  {
    title: 'Function calls - should not allow calling IIFE',
    input: '{ date: (function() { return "10"; })() }',
    options: functionCallOptions,
    expected: '',
  },
  {
    title:
      'Function calls - should prevent attempting to break the sandbox for identifiers',
    input:
      "{ exploit: clearImmediate.constructor('return process;')().exit(1) }",
    options: functionCallOptions,
    expected: '',
  },
  {
    title:
      'Function calls - should prevent attempting to break the sandbox for literals',
    input: `{ exploit: "".toString.constructor('return process;')().exit(1) }`,
    options: functionCallOptions,
    expected: '',
  },

  {
    title: 'Comments - should disallow comment mode if turned off',
    input: commentsTemplate,
    options: { mode: ParseMode.Strict, allowComments: false },
    expected: '',
  },
  {
    title: 'Comments - should allow // and /* */ comments',
    input: commentsTemplate,
    options: { mode: ParseMode.Strict, allowComments: true },
    expected: { this: 'is', to: 'see' },
  },

  {
    title:
      'should correctly parse NumberLong bigger than Number.MAX_SAFE_INTEGER',
    input: "{ n: NumberLong('345678654321234552') }",
    expected: { n: bson.Long.fromString('345678654321234552') },
  },
  {
    title: 'should correctly parse Int64 bigger than Number.MAX_SAFE_INTEGER',
    input: "{ n: Int64('345678654321234552') }",
    expected: { n: bson.Long.fromString('345678654321234552') },
  },

  // Flattened from a test with two assertions (leading vs trailing comment).
  {
    title: 'should correctly parse when a leading comment is present',
    input: '// foo\n{ x: 1 }',
    options: { mode: ParseMode.Loose },
    expected: { x: 1 },
  },
  {
    title: 'should correctly parse when a trailing comment is present',
    input: '{ x: 1 }\n// bar',
    options: { mode: ParseMode.Loose },
    expected: { x: 1 },
  },
];
