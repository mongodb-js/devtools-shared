import * as bson from 'bson';
import parse from '../src';
import type { Options } from '../src/options';
import { ParseMode } from '../src/options';
import { expect } from 'chai';
import type { SinonSandbox } from 'sinon';
import { createSandbox } from 'sinon';

describe('ejson-shell-parser', function () {
  it('should correctly parse a valid object', function () {
    expect(parse('{_id:"hello"}')).to.deep.equal({ _id: 'hello' });
  });

  it('should accept an empty object', function () {
    expect(parse('{ }')).to.deep.equal({});
  });

  it('should parse special globals / values', function () {
    const input = `{
    infinity: Infinity,
    NaN: NaN,
    undefined: undefined,
    null: null
  }`;
    expect(parse(input)).to.deep.equal({
      infinity: Infinity,
      NaN: NaN,
      undefined: undefined,
      null: null,
    });
  });

  it('should accept a complex query', function () {
    expect(
      parse(`{
    RegExp: /test/ig,
    Binary: new Binary(),
    BinData: BinData(3, 'dGVzdAo='),
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
  }`)
    ).to.deep.equal({
      RegExp: /test/gi,
      Binary: new bson.Binary(),
      BinData: new bson.Binary(Buffer.from('dGVzdAo=', 'base64'), 3),
      UUID: new bson.Binary(
        Buffer.from('3d37923dab8e49319e4693df5fd3599e', 'hex'),
        4
      ),
      Code: new bson.Code('function() {}'),
      DBRef: new bson.DBRef(
        'tests',
        new bson.ObjectId('5e159ba7eac34211f2252aaa'),
        'test'
      ),
      Decimal128: bson.Decimal128.fromString('128'),
      NumberDecimal: bson.Decimal128.fromString('12345'),
      Double: new bson.Double(10.1),
      Int32: new bson.Int32(10),
      NumberInt: 100,
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
    });
  });

  it('should support binary operators (like plus / minus)', function () {
    expect(
      parse(`{
    _id: ObjectId("5e159ba7eac34211f2252aaa"),
    created: Timestamp(10 + 10, 10),
    filter: { year: { $gte: 2021 - (1/2 + 0.5 - (5 * 0)) } },
  }`)
    ).to.deep.equal({
      _id: new bson.ObjectId('5e159ba7eac34211f2252aaa'),
      created: new bson.Timestamp({ i: 10, t: 20 }),
      filter: { year: { $gte: 2020 } },
    });
  });

  it('should support parsing array operators', function () {
    expect(
      parse(`[{
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
  }]`)
    ).to.deep.equal([
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
    ]);
  });

  it('should not allow calling functions that do not exist', function () {
    expect(parse('{ date: require("") }')).to.equal('');
  });

  for (const mode of [ParseMode.Extended, ParseMode.Strict, ParseMode.Loose]) {
    it('should not allow calling functions that only exist as Object.prototype properties', function () {
      expect(parse('{ date: Date.constructor("") }', { mode })).to.equal('');
      expect(parse('{ date: Date.hasOwnProperty("") }', { mode })).to.equal('');
      expect(parse('{ date: Date.__proto__("") }', { mode })).to.equal('');
      expect(
        parse('{ date: Code({ toString: Date.constructor("throw null;") }) }', {
          mode,
        })
      ).to.equal('');
    });
  }

  describe('Function calls', function () {
    const options: Partial<Options> = {
      mode: ParseMode.Strict,
      allowMethods: true,
    };

    describe('Should deny calls if functions are not allowed', function () {
      it('reject calls to Math', function () {
        expect(
          parse('{ floor: Math.floor(5.5) }', {
            mode: ParseMode.Strict,
            allowMethods: false,
          })
        ).to.equal('');
      });

      for (const dateFn of ['new Date', 'new ISODate', 'Date', 'ISODate']) {
        context(`Prevent calling function calls on "${dateFn}"`, function () {
          it('reject calls', function () {
            expect(
              parse(`{ date: (${dateFn}(0)).getFullYear() }`, {
                mode: ParseMode.Strict,
                allowMethods: false,
              })
            ).to.equal('');
          });
        });
      }
    });

    describe('Math', function () {
      it('should allow parsing while using functions from Math', function () {
        const input = `{
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
        }`;
        expect(parse(input, options)).to.deep.equal({
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
        });
      });

      it('should be able to handle math expressions', function () {
        expect(
          parse(
            '{ simpleCalc: (5 * Math.floor(5.5) + Math.ceil(5.5)) }',
            options
          )
        ).to.deep.equal({ simpleCalc: 31 });
      });

      it('should prevent invalid functions', function () {
        expect(parse('{ simpleCalc: Math.totallyLegit(5) }', options)).to.equal(
          ''
        );
      });
    });

    describe('Function expressions', function () {
      it('should allow functions as object properties', function () {
        expect(
          parse('{ $where: function() { this.x = 1 }}', options)
        ).to.deep.equal({
          $where: 'function() { this.x = 1 }',
        });
      });

      it('should not allow functions outside object properties', function () {
        expect(parse('function() { this.x = 1 }', options)).to.equal('');
      });

      it('should allow multiline functions', function () {
        expect(
          parse('{ $where: function\n()\n{\nthis.x = 1\n}}', options)
        ).to.deep.equal({
          $where: 'function\n()\n{\nthis.x = 1\n}',
        });
      });

      it('should allow arrow functions', function () {
        expect(parse('{ $where: () => true }', options)).to.deep.equal({
          $where: '() => true',
        });
      });

      it('should allow $expr queries', function () {
        expect(
          parse(`{
        $expr: {
          $function: {
            body: function(name) { return hex_md5(name) == "15b0a220baa16331e8d80e15367677ad"; },
            args: [ "$name" ],
            lang: "js"
          }
        }
      }`)
        ).to.deep.equal({
          $expr: {
            $function: {
              body: 'function(name) { return hex_md5(name) == "15b0a220baa16331e8d80e15367677ad"; }',
              args: ['$name'],
              lang: 'js',
            },
          },
        });
      });
    });

    describe('Date', function () {
      let sandbox: SinonSandbox;

      beforeEach(function () {
        sandbox = createSandbox();
      });
      afterEach(function () {
        sandbox.restore();
      });

      it('should allow calling .now()', function () {
        const dateSpy = sandbox.stub(Date, 'now');
        dateSpy.returns(1578974885017);

        expect(parse('{ now: Date.now() }', options)).to.deep.equal({
          now: 1578974885017,
        });
      });

      for (const dateFn of ['new Date', 'new ISODate', 'ISODate']) {
        context(
          `Date allow using member methods with "${dateFn}"`,
          function () {
            it('should allow member expressions', function () {
              const isoString = '1996-02-24T23:01:59.001Z';
              const newDate = `${dateFn}('${isoString}')`;
              const input = `{
          getDate: (${newDate}).getDate(),
          getDay: (${newDate}).getDay(),
          getFullYear: (${newDate}).getFullYear(),
          getHours: (${newDate}).getHours(),
          getMilliseconds: (${newDate}).getMilliseconds(),
          getMinutes: (${newDate}).getMinutes(),
          getMonth: (${newDate}).getMonth(),
          getSeconds: (${newDate}).getSeconds(),
          getTime: (${newDate}).getTime(),
          getTimezoneOffset: (${newDate}).getTimezoneOffset(),
          getUTCDate: (${newDate}).getUTCDate(),
          getUTCDay: (${newDate}).getUTCDay(),
          getUTCFullYear: (${newDate}).getUTCFullYear(),
          getUTCHours: (${newDate}).getUTCHours(),
          getUTCMilliseconds: (${newDate}).getUTCMilliseconds(),
          getUTCMinutes: (${newDate}).getUTCMinutes(),
          getUTCMonth: (${newDate}).getUTCMonth(),
          getUTCSeconds: (${newDate}).getUTCSeconds(),
          getYear: (${newDate}).getYear(),
          setDate: (${newDate}).setDate(24),
          setFullYear: (${newDate}).setFullYear(2010),
          setHours: (${newDate}).setHours(23),
          setMilliseconds: (${newDate}).setMilliseconds(1),
          setMinutes: (${newDate}).setMinutes(1),
          setMonth: (${newDate}).setMonth(1),
          setSeconds: (${newDate}).setSeconds(59),
          setTime: (${newDate}).setTime(10),
          setUTCDate: (${newDate}).setUTCDate(24),
          setUTCFullYear: (${newDate}).setUTCFullYear(2010),
          setUTCHours: (${newDate}).setUTCHours(23),
          setUTCMilliseconds: (${newDate}).setUTCMilliseconds(1),
          setUTCMinutes: (${newDate}).setUTCMinutes(1),
          setUTCMonth: (${newDate}).setUTCMonth(1),
          setUTCSeconds: (${newDate}).setUTCSeconds(59),
          setYear: (${newDate}).setYear(96),
          toISOString: (${newDate}).toISOString(),
       }`;
              expect(parse(input, options)).to.deep.equal({
                getDate: new Date(isoString).getDate(),
                getDay: new Date(isoString).getDay(),
                getFullYear: new Date(isoString).getFullYear(),
                getHours: new Date(isoString).getHours(),
                getMilliseconds: new Date(isoString).getMilliseconds(),
                getMinutes: new Date(isoString).getMinutes(),
                getMonth: new Date(isoString).getMonth(),
                getSeconds: new Date(isoString).getSeconds(),
                getTime: new Date(isoString).getTime(),
                getTimezoneOffset: new Date(isoString).getTimezoneOffset(),
                getUTCDate: new Date(isoString).getUTCDate(),
                getUTCDay: new Date(isoString).getUTCDay(),
                getUTCFullYear: new Date(isoString).getUTCFullYear(),
                getUTCHours: new Date(isoString).getUTCHours(),
                getUTCMilliseconds: new Date(isoString).getUTCMilliseconds(),
                getUTCMinutes: new Date(isoString).getUTCMinutes(),
                getUTCMonth: new Date(isoString).getUTCMonth(),
                getUTCSeconds: new Date(isoString).getUTCSeconds(),
                getYear: (new Date(isoString) as any).getYear(), // getYear is deprecated
                setDate: new Date(isoString).setDate(24),
                setFullYear: new Date(isoString).setFullYear(2010),
                setHours: new Date(isoString).setHours(23),
                setMilliseconds: new Date(isoString).setMilliseconds(1),
                setMinutes: new Date(isoString).setMinutes(1),
                setMonth: new Date(isoString).setMonth(1),
                setSeconds: new Date(isoString).setSeconds(59),
                setTime: new Date(isoString).setTime(10),
                setUTCDate: new Date(isoString).setUTCDate(24),
                setUTCFullYear: new Date(isoString).setUTCFullYear(2010),
                setUTCHours: new Date(isoString).setUTCHours(23),
                setUTCMilliseconds: new Date(isoString).setUTCMilliseconds(1),
                setUTCMinutes: new Date(isoString).setUTCMinutes(1),
                setUTCMonth: new Date(isoString).setUTCMonth(1),
                setUTCSeconds: new Date(isoString).setUTCSeconds(59),
                setYear: (new Date(isoString) as any).setYear(96), // setYear is deprecated
                toISOString: new Date(isoString).toISOString(),
              });
            });

            it('should prevent invalid functions', function () {
              const input = `{ evilDate: (${dateFn}(0)).totallyLegit(5) }`;
              expect(parse(input, options)).to.equal('');
            });
          }
        );
      }

      it('should return a string if you use Date() without new', function () {
        const isoString = '1996-02-24T23:01:59.001Z';
        const newDate = `Date('${isoString}')`;

        const input = `${newDate}`;

        expect(parse(input, options)).to.include(
          String(new Date().getUTCFullYear())
        );
      });
    });

    // Testing more realistic examples of using the Date object
    for (const [input, result] of [
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
    ] as const) {
      context('complicated parsing of Math and Date', function () {
        it(`should parse ${input} as ${JSON.stringify(result)}`, function () {
          expect(parse(input, options)).to.deep.equal(result);
        });
      });
    }
  });

  describe('Comments', function () {
    const options: Partial<Options> = {
      mode: ParseMode.Strict,
      allowComments: true,
    };

    const input = `{
    this: 'is', // a test
    to: 'see' /* if comments work as expected */
  }`;

    it('should disallow comment mode if turned off', function () {
      const noCommentOption = { mode: ParseMode.Strict, allowComments: false };

      expect(parse(input, noCommentOption)).to.equal('');
    });

    it('should allow // and /* */ comments', function () {
      expect(parse(input, options)).to.deep.equal({
        this: 'is',
        to: 'see',
      });
    });
  });

  it('should not allow calling IIFE', function () {
    expect(parse('{ date: (function() { return "10"; })() }')).to.equal('');
  });

  it('should prevent attempting to break the sandbox', function () {
    const input =
      "{ exploit: clearImmediate.constructor('return process;')().exit(1) }";
    expect(parse(input)).to.equal('');
  });

  it('should correctly parse NumberLong and Int64 bigger than Number.MAX_SAFE_INTEGER', function () {
    expect(
      parse("{ n: NumberLong('345678654321234552') }").n.toString()
    ).to.equal('345678654321234552');

    expect(parse("{ n: Int64('345678654321234552') }").n.toString()).to.equal(
      '345678654321234552'
    );
  });

  it('should correctly parse when leading and trailing comments are present', function () {
    const opts = { mode: ParseMode.Loose };
    expect(parse('// foo\n{ x: 1 }', opts)).to.deep.equal({ x: 1 });
    expect(parse('{ x: 1 }\n// bar', opts)).to.deep.equal({ x: 1 });
  });
});
