import * as bson from 'bson';
import { parse } from '../src/parse';
import { ParseMode } from '../src/options';

type ToJSStringTestCase = {
  title: string;
  input: unknown;
  indent?: number | string;
  expected: string;
};

type ToJSStringRoundTripTestCase = {
  title: string;
  input: unknown;
  indent?: number | string;
};

const dbRef = (
  collection: string,
  oid: unknown,
  db?: string,
  fields?: Record<string, unknown>,
) => new bson.DBRef(collection, oid as bson.ObjectId, db, fields);

export const filterOptions = {
  mode: ParseMode.Loose,
  allowMethods: true,
} as const;

export const TO_JS_STRING_TEST_CASES: ToJSStringTestCase[] = [
  {
    title: 'toJSString - should default to two spaces',
    input: { a: { $exists: true } },
    expected: `{
  a: {
    $exists: true
  }
}`,
  },
  {
    title: 'toJSString - should allow falsy indentation',
    input: { a: { $exists: true } },
    indent: 0,
    expected: '{a:{$exists:true}}',
  },
  {
    title: 'toJSString - allows passing custom indent',
    input: { a: { $exists: true } },
    indent: 'pineapple',
    expected: `{
pineapplea: {
pineapplepineapple$exists: true
pineapple}
}`,
  },
  {
    title: 'toJSString - retains double spaces and new lines in strings',
    input: {
      a: {
        name: 'multi-line with s  p    a   c\n        \ne  s',
      },
    },
    indent: 0,
    expected: "{a:{name:'multi-line with s  p    a   c\\n        \\ne  s'}}",
  },

  {
    title:
      'toJSString > DBRef - preserves the oid type rather than flattening it to a string (numeric oid)',
    input: { a: dbRef('col', 1) },
    indent: 0,
    expected: '{a:DBRef("col", 1)}',
  },
  {
    title:
      'toJSString > DBRef - preserves the oid type rather than flattening it to a string (string oid)',
    input: { a: dbRef('col', 'abc') },
    indent: 0,
    expected: '{a:DBRef("col", \'abc\')}',
  },
  {
    title:
      'toJSString > DBRef - preserves the oid type rather than flattening it to a string (ObjectId oid)',
    input: {
      a: dbRef('col', new bson.ObjectId('507f191e810c19729de860ea')),
    },
    indent: 0,
    expected: '{a:DBRef("col", ObjectId(\'507f191e810c19729de860ea\'))}',
  },
  {
    title: 'toJSString > DBRef - includes the db when present',
    input: { a: dbRef('col', 1, 'db') },
    indent: 0,
    expected: '{a:DBRef("col", 1, "db")}',
  },
  {
    title: 'toJSString > DBRef - includes the fields when present',
    input: { a: dbRef('col', 1, 'db', { b: 1 }) },
    indent: 0,
    expected: '{a:DBRef("col", 1, "db", {b:1})}',
  },
  {
    title:
      'toJSString > DBRef - passes an undefined db when fields are present without one',
    input: { a: dbRef('col', 1, undefined, { b: 1 }) },
    indent: 0,
    expected: '{a:DBRef("col", 1, undefined, {b:1})}',
  },
  {
    title: 'toJSString > DBRef - omits empty fields',
    input: { a: dbRef('col', 1, undefined, {}) },
    indent: 0,
    expected: '{a:DBRef("col", 1)}',
  },
  {
    title: 'toJSString > DBRef - preserves BSON types inside fields',
    input: {
      a: dbRef('col', 1, 'db', {
        b: new bson.ObjectId('507f191e810c19729de860ea'),
      }),
    },
    indent: 0,
    expected:
      '{a:DBRef("col", 1, "db", {b:ObjectId(\'507f191e810c19729de860ea\')})}',
  },
  {
    title: 'toJSString > DBRef - escapes quotes in the collection and db',
    input: { a: dbRef("co'l", 1, 'd"b') },
    indent: 0,
    expected: '{a:DBRef("co\'l", 1, "d\\"b")}',
  },

  {
    title: 'toJSString with indent 0 - should not add extra space when nesting',
    input: { a: { $exists: true } },
    indent: 0,
    expected: '{a:{$exists:true}}',
  },
  {
    title:
      'toJSString with indent 0 - preserves multi-space and newline values',
    input: {
      a: {
        name: 'multi-line with s  p    a   c\n        \ne  s',
      },
    },
    indent: 0,
    expected: "{a:{name:'multi-line with s  p    a   c\\n        \\ne  s'}}",
  },
  {
    title:
      'toJSString with indent 0 > when providing a long - correctly converts to NumberLong (small)',
    input: { test: bson.Long.fromNumber(5) },
    indent: 0,
    expected: "{test:NumberLong('5')}",
  },
  {
    title:
      'toJSString with indent 0 > when providing a long - correctly converts to NumberLong (large)',
    input: { test: new bson.Long('123456789123456789') },
    indent: 0,
    expected: "{test:NumberLong('123456789123456789')}",
  },
  {
    title:
      'toJSString with indent 0 > when providing a decimal128 - correctly converts to NumberDecimal',
    input: { test: bson.Decimal128.fromString('5.5') },
    indent: 0,
    expected: "{test:NumberDecimal('5.5')}",
  },
  {
    title:
      'toJSString with indent 0 > when providing an int32 - correctly converts to Int32',
    input: { test: new bson.Int32(123) },
    indent: 0,
    expected: "{test:NumberInt('123')}",
  },
  {
    title:
      'toJSString with indent 0 > when providing a Double - correctly converts to Double',
    input: { test: new bson.Double(0.8) },
    indent: 0,
    expected: "{test:Double('0.8')}",
  },
  {
    title:
      'toJSString with indent 0 > when providing a geo query - does not add any whitespace',
    input: {
      coordinates: {
        $geoWithin: {
          $centerSphere: [[-79, 28], 0.04],
        },
      },
    },
    indent: 0,
    expected: '{coordinates:{$geoWithin:{$centerSphere:[[-79,28],0.04]}}}',
  },
  {
    title:
      'toJSString with indent 0 > when provided a RegExp - handles /regex/ format',
    input: { name: /pineapple/ },
    indent: 0,
    expected: '{name:RegExp("pineapple")}',
  },
  {
    title:
      'toJSString with indent 0 > when provided a BSONRegExp - stringifies correctly with options',
    input: { name: new bson.BSONRegExp('pineapple', 'i') },
    indent: 0,
    expected: '{name:RegExp("pineapple", \'i\')}',
  },
  {
    title:
      'toJSString with indent 0 > when provided a BSONRegExp - stringifies correctly with quotes',
    input: { name: new bson.BSONRegExp('"\'', 'i') },
    indent: 0,
    expected: '{name:RegExp("\\"\'", \'i\')}',
  },
  {
    title:
      'toJSString with indent 0 > when provided a BSONRegExp - stringifies correctly without options',
    input: { name: new bson.BSONRegExp('pineapple') },
    indent: 0,
    expected: '{name:RegExp("pineapple")}',
  },
  {
    title:
      'toJSString with indent 0 > when provided a BSONRegExp - stringifies into BSONRegExp when js RegExp cannot handle an option',
    input: {
      name: new bson.BSONRegExp(
        'pineapple',
        'x' /* x flag is not valid in js but valid in BSONRegExp*/,
      ),
    },
    indent: 0,
    expected: '{name:BSONRegExp("pineapple", \'x\')}',
  },
  {
    title:
      'toJSString with indent 0 > when provided a BSONRegExp - stringifies into BSONRegExp when js RegExp cannot handle the regex',
    input: {
      name: new bson.BSONRegExp(
        // Perl Compatible Regular Expressions supported feature that isn't
        // in regular js RegExp: case-insensitive match.
        '(?i)a(?-i)cme',
        'i',
      ),
    },
    indent: 0,
    expected: '{name:BSONRegExp("(?i)a(?-i)cme", \'i\')}',
  },

  // The cases below build their `input` by parsing shell syntax (in place
  // of the original tests' `validate('filter', ...)` call) rather than
  // constructing the value directly - kept separate from the literal-input
  // cases above for that reason.
  {
    title: 'toJSString with indent 0 - should work',
    input: parse('{_id: ObjectId("58c33a794d08b991e3648fd2")}', filterOptions),
    indent: 0,
    expected: "{_id:ObjectId('58c33a794d08b991e3648fd2')}",
  },
  {
    title:
      'toJSString with indent 0 > when providing a Date - correctly converts to an ISODate',
    input: parse("{test: new Date('2017-01-01T12:35:31.000Z')}", filterOptions),
    indent: 0,
    expected: "{test:ISODate('2017-01-01T12:35:31.000Z')}",
  },
  {
    title:
      'toJSString with indent 0 > when providing a Date - falls back to an invalid ISODate if the provided Date is invalid',
    input: parse("{test: new Date('invalid')}", filterOptions),
    indent: 0,
    expected: "{test:ISODate('Invalid Date')}",
  },
  {
    title:
      'toJSString with indent 0 > when providing an ISODate - correctly converts to an ISODate',
    input: parse("{test: ISODate('2017-01-01T12:35:31.000Z')}", filterOptions),
    indent: 0,
    expected: "{test:ISODate('2017-01-01T12:35:31.000Z')}",
  },
  {
    title:
      'toJSString with indent 0 > when providing a DBRef with (collection, oid) - correctly converts to a DBRef',
    input: parse("{dbref: DBRef('col', 1)}", filterOptions),
    indent: 0,
    expected: '{dbref:DBRef("col", 1)}',
  },
  {
    title:
      'toJSString with indent 0 > when providing a DBRef with (db.collection, oid) - correctly converts to a DBRef',
    input: parse("{dbref: DBRef('db.col', 1)}", filterOptions),
    indent: 0,
    expected: '{dbref:DBRef("col", 1, "db")}',
  },
  {
    title:
      'toJSString with indent 0 > when providing a DBRef with (collection, oid, db) - correctly converts to a DBRef',
    input: parse("{dbref: DBRef('col', 1, 'db')}", filterOptions),
    indent: 0,
    expected: '{dbref:DBRef("col", 1, "db")}',
  },
  {
    title:
      'toJSString with indent 0 > when provided a RegExp - correctly formats the options',
    input: parse('{name: /foo/i}', filterOptions),
    indent: 0,
    expected: '{name:RegExp("foo", \'i\')}',
  },
  {
    title: 'toJSString with indent 0 > when provided a RegExp - escapes quotes',
    input: parse("{name: /'/}", filterOptions),
    indent: 0,
    expected: '{name:RegExp("\'")}',
  },
  {
    title:
      'toJSString with indent 0 > when provided a RegExp - handles $regex object format (keeps format)',
    input: parse(
      '{"name": {"$regex": "pineapple", "$options": "i"}}',
      filterOptions,
    ),
    indent: 0,
    expected: "{name:{$regex:'pineapple',$options:'i'}}",
  },
  {
    title:
      'toJSString with indent 0 > when provided a Binary - should support BinData',
    input: parse(
      `{name: new BinData(${bson.Binary.SUBTYPE_BYTE_ARRAY}, "OyQRAeK7QlWMr0E2xWapYg==")}`,
      filterOptions,
    ),
    indent: 0,
    expected: `{name:BinData(${bson.Binary.SUBTYPE_BYTE_ARRAY}, 'OyQRAeK7QlWMr0E2xWapYg==')}`,
  },
  {
    title:
      'toJSString with indent 0 > when provided a Binary - should support UUID',
    input: parse(
      '{name: UUID("3b241101-e2bb-4255-8caf-4136c566a962")}',
      filterOptions,
    ),
    indent: 0,
    expected: "{name:UUID('3b241101-e2bb-4255-8caf-4136c566a962')}",
  },
  {
    title:
      'toJSString with indent 0 > when provided a Binary - does not convert LegacyJavaUUID to UUID',
    input: parse(
      '{name: LegacyJavaUUID("00112233-4455-6677-8899-aabbccddeeff")}',
      filterOptions,
    ),
    indent: 0,
    expected: "{name:BinData(3, 'd2ZVRDMiEQD/7t3Mu6qZiA==')}",
  },
  {
    title:
      'toJSString with indent 0 > when provided a Binary - does not convert LegacyCSharpUUID to UUID',
    input: parse(
      '{name: LegacyCSharpUUID("00112233-4455-6677-8899-aabbccddeeff")}',
      filterOptions,
    ),
    indent: 0,
    expected: "{name:BinData(3, 'MyIRAFVEd2aImaq7zN3u/w==')}",
  },
  {
    title:
      'toJSString with indent 0 > when provided a Binary - does not convert LegacyPythonUUID to UUID',
    input: parse(
      '{name: LegacyPythonUUID("00112233-4455-6677-8899-aabbccddeeff")}',
      filterOptions,
    ),
    indent: 0,
    expected: "{name:BinData(3, 'ABEiM0RVZneImaq7zN3u/w==')}",
  },
  {
    // https://www.mongodb.com/docs/manual/reference/method/Binary.createFromHexString/
    title:
      'toJSString with indent 0 > when provided a Binary - should support Binary.createFromHexString',
    input: parse(
      `{name: Binary.createFromHexString("deadbeef", ${bson.Binary.SUBTYPE_BYTE_ARRAY})}`,
      filterOptions,
    ),
    indent: 0,
    expected: `{name:BinData(${bson.Binary.SUBTYPE_BYTE_ARRAY}, '3q2+7w==')}`,
  },
  {
    // https://www.mongodb.com/docs/manual/reference/method/Binary.createFromBase64/
    title:
      'toJSString with indent 0 > when provided a Binary - should support Binary.createFromBase64',
    input: parse(
      `{name: Binary.createFromBase64("3q2+7w==", ${bson.Binary.SUBTYPE_BYTE_ARRAY})}`,
      filterOptions,
    ),
    indent: 0,
    expected: `{name:BinData(${bson.Binary.SUBTYPE_BYTE_ARRAY}, '3q2+7w==')}`,
  },
];

// These verify round-trip fidelity (stringify -> parse -> original value).
export const TO_JS_STRING_ROUND_TRIP_TEST_CASES: ToJSStringRoundTripTestCase[] =
  [
    {
      title:
        'toJSString round-trip - escapes quotes, backslashes and newlines in Code',
      input: { a: new bson.Code(`a "b" 'c' \\d\ne`) },
    },
    {
      title: 'toJSString round-trip - escapes Code with a scope',
      input: { a: new bson.Code(`');process.exit(1);('`, { b: 1 }) },
    },
    {
      title: 'toJSString round-trip - DBRef with numeric oid',
      input: { a: dbRef('col', 1) },
      indent: 0,
    },
    {
      title: 'toJSString round-trip - DBRef with string oid',
      input: { a: dbRef('col', 'abc') },
      indent: 0,
    },
    {
      title: 'toJSString round-trip - DBRef with ObjectId oid',
      input: {
        a: dbRef('col', new bson.ObjectId('507f191e810c19729de860ea')),
      },
      indent: 0,
    },
    {
      title: 'toJSString round-trip - DBRef with db',
      input: { a: dbRef('col', 1, 'db') },
      indent: 0,
    },
    {
      title: 'toJSString round-trip - DBRef with quotes',
      input: { a: dbRef("co'l", 1, 'd"b') },
      indent: 0,
    },
    {
      title: 'toJSString round-trip - DBRef with double spaces',
      input: { a: dbRef('a  b', 1) },
      indent: 0,
    },
    {
      title: 'toJSString round-trip - DBRef with newline',
      input: { a: dbRef('a\nb', 1) },
      indent: 0,
    },
    {
      title: 'toJSString round-trip - DBRef with nested DBRef oid',
      input: { a: dbRef('col', dbRef('inner', 1), 'db') },
      indent: 0,
    },
    {
      title: 'toJSString round-trip - DBRef with fields',
      input: { a: dbRef('col', 1, 'db', { b: 1 }) },
      indent: 0,
    },
    {
      title: 'toJSString round-trip - DBRef with fields but no db',
      input: { a: dbRef('col', 1, undefined, { b: 1 }) },
      indent: 0,
    },
    {
      title: 'toJSString round-trip - DBRef with BSON values in fields',
      input: {
        a: dbRef('col', 1, 'db', {
          b: new bson.ObjectId('507f191e810c19729de860ea'),
        }),
      },
      indent: 0,
    },
  ];
