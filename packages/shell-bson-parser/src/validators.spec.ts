import assert from 'assert';
import sinon from 'sinon';
import bson from 'bson';

import {
  DEFAULT_LIMIT,
  DEFAULT_MAX_TIME_MS,
  DEFAULT_SKIP,
  validate,
} from './validators';

function convert(string: string) {
  const res = validate('filter', string);
  const ret = bson.EJSON.serialize(res, { legacy: true, relaxed: false });
  return ret;
}

describe('query validators and parser', function () {
  describe('filter', function () {
    context('when no new keyword is provided', function () {
      it('returns the filter', function () {
        const res = validate(
          'filter',
          '{_id: ObjectId("58c33a794d08b991e3648fd2")}',
        );
        assert.deepEqual(res, {
          _id: new bson.ObjectId('58c33a794d08b991e3648fd2'),
        });
      });
    });

    context('when a new keyword is provided', function () {
      it('returns the filter', function () {
        const res = validate(
          'filter',
          '{_id: new ObjectId("58c33a794d08b991e3648fd2")}',
        );
        assert.deepEqual(res, {
          _id: new bson.ObjectId('58c33a794d08b991e3648fd2'),
        });
      });
    });

    describe('shell helpers', function () {
      it('should support Code', function () {
        assert.deepEqual(convert('Code("return true", {})'), {
          $code: 'return true',
          $scope: {},
        });
      });

      it('should support new Date', function () {
        assert.deepEqual(convert('new Date("2017-01-01T12:35:31.123Z")'), {
          $date: '2017-01-01T12:35:31.123Z',
        });
      });

      it('should support new Date (0 ms)', function () {
        assert.deepEqual(convert('new Date("2017-01-01T12:35:31.000Z")'), {
          $date: '2017-01-01T12:35:31Z',
        });
      });

      it('should support ISODate', function () {
        assert.deepEqual(convert('ISODate("2017-01-01T12:35:31.123Z")'), {
          $date: '2017-01-01T12:35:31.123Z',
        });
      });

      it('should support ISODate (0 ms)', function () {
        assert.deepEqual(convert('ISODate("2017-01-01T12:35:31.000Z")'), {
          $date: '2017-01-01T12:35:31Z',
        });
      });

      it('should support new ISODate', function () {
        assert.deepEqual(convert('new ISODate("2017-01-01T12:35:31.123Z")'), {
          $date: '2017-01-01T12:35:31.123Z',
        });
      });

      it('should support new ISODate (0 ms)', function () {
        assert.deepEqual(convert('new ISODate("2017-01-01T12:35:31.000Z")'), {
          $date: '2017-01-01T12:35:31Z',
        });
      });

      it('should support BinData', function () {
        assert.deepEqual(
          convert(
            `new BinData(${bson.Binary.SUBTYPE_BYTE_ARRAY}, "OyQRAeK7QlWMr0E2xWapYg==")`,
          ),
          {
            $binary: 'OyQRAeK7QlWMr0E2xWapYg==',
            $type: `0${bson.Binary.SUBTYPE_BYTE_ARRAY}`,
          },
        );
      });

      it('should support UUID', function () {
        assert.deepEqual(
          convert('UUID("3b241101-e2bb-4255-8caf-4136c566a962")'),
          {
            $binary: 'OyQRAeK7QlWMr0E2xWapYg==',
            $type: `0${bson.Binary.SUBTYPE_UUID}`,
          },
        );
      });

      it('should support LegacyJavaUUID', function () {
        assert.deepEqual(
          convert('LegacyJavaUUID("00112233-4455-6677-8899-aabbccddeeff")'),
          {
            $binary: 'd2ZVRDMiEQD/7t3Mu6qZiA==',
            $type: `0${bson.Binary.SUBTYPE_UUID_OLD}`,
          },
        );
      });

      it('should support LegacyCSharpUUID', function () {
        assert.deepEqual(
          convert('LegacyCSharpUUID("00112233-4455-6677-8899-aabbccddeeff")'),
          {
            $binary: 'MyIRAFVEd2aImaq7zN3u/w==',
            $type: `0${bson.Binary.SUBTYPE_UUID_OLD}`,
          },
        );
      });

      it('should support LegacyPythonUUID', function () {
        assert.deepEqual(
          convert('LegacyPythonUUID("00112233-4455-6677-8899-aabbccddeeff")'),
          {
            $binary: 'ABEiM0RVZneImaq7zN3u/w==',
            $type: `0${bson.Binary.SUBTYPE_UUID_OLD}`,
          },
        );
      });

      // https://www.mongodb.com/docs/manual/reference/method/Binary.createFromHexString/
      it('should support Binary.createFromHexString', function () {
        assert.deepEqual(
          convert(
            `Binary.createFromHexString("deadbeef", ${bson.Binary.SUBTYPE_BYTE_ARRAY})`,
          ),
          {
            $binary: '3q2+7w==',
            $type: `0${bson.Binary.SUBTYPE_BYTE_ARRAY}`,
          },
        );
      });

      // https://www.mongodb.com/docs/manual/reference/method/Binary.createFromBase64/
      it('should support Binary.createFromBase64', function () {
        assert.deepEqual(
          convert(
            `Binary.createFromBase64("3q2+7w==", ${bson.Binary.SUBTYPE_BYTE_ARRAY})`,
          ),
          {
            $binary: '3q2+7w==',
            $type: `0${bson.Binary.SUBTYPE_BYTE_ARRAY}`,
          },
        );
      });

      it('should support functions', function () {
        assert.deepEqual(convert('{$match: () => true}'), {
          $match: '() => true',
        });

        assert.deepEqual(
          convert(
            `{
            $expr: {
              $function: {
                body: function(name) { return hex_md5(name) == "15b0a220baa16331e8d80e15367677ad"; },
                args: [ "$name" ],
                lang: "js"
              }
            }
          }`,
          ),
          {
            $expr: {
              $function: {
                body: 'function(name) { return hex_md5(name) == "15b0a220baa16331e8d80e15367677ad"; }',
                args: ['$name'],
                lang: 'js',
              },
            },
          },
        );

        assert.deepEqual(
          convert('{$match: function() { return this.x === 2; }}'),
          {
            $match: 'function() { return this.x === 2; }',
          },
        );
      });

      context('for Date() and ISODate() without argument', function () {
        // mock a specific timestamp with sinon.useFakeTimers
        const now = 1533789516225;
        const nowStr = '2018-08-09T04:38:36.225Z';
        let clock: sinon.SinonFakeTimers;

        beforeEach(function () {
          clock = sinon.useFakeTimers(now);
        });

        afterEach(function () {
          clock.restore();
        });

        it('should support new Date', function () {
          assert.deepEqual(convert('new Date()'), {
            $date: nowStr,
          });
        });

        it('should support ISODate', function () {
          assert.deepEqual(convert('ISODate()'), {
            $date: nowStr,
          });
        });

        it('should support new ISODate', function () {
          assert.deepEqual(convert('new ISODate()'), {
            $date: nowStr,
          });
        });
      });

      it('should support Timestamp', function () {
        assert.deepEqual(convert('{t: Timestamp(0, 0)}'), {
          t: { $timestamp: { i: 0, t: 0 } },
        });
      });

      it('should support new Timestamp', function () {
        assert.deepEqual(convert('{t: new Timestamp(0, 0)}'), {
          t: { $timestamp: { i: 0, t: 0 } },
        });
      });

      it('should support inline regex', function () {
        assert.deepEqual(convert('/some.*regex+/i'), {
          $regex: 'some.*regex+',
          $options: 'i',
        });
      });

      it('should support RegExp', function () {
        assert.deepEqual(convert("RegExp('some.*regex+', 'i')"), {
          $regex: 'some.*regex+',
          $options: 'i',
        });
      });

      it('should support new RegExp', function () {
        assert.deepEqual(convert("new RegExp('some.*regex+', 'i')"), {
          $regex: 'some.*regex+',
          $options: 'i',
        });
      });

      it('should support ObjectId', function () {
        assert.deepEqual(convert('ObjectId("58c33a794d08b991e3648fd2")'), {
          $oid: '58c33a794d08b991e3648fd2',
        });
      });

      it('should support new ObjectId', function () {
        assert.deepEqual(convert('new ObjectId("58c33a794d08b991e3648fd2")'), {
          $oid: '58c33a794d08b991e3648fd2',
        });
      });

      it('should support ObjectID', function () {
        assert.deepEqual(convert('ObjectID("58c33a794d08b991e3648fd2")'), {
          $oid: '58c33a794d08b991e3648fd2',
        });
      });

      it('should support new ObjectID', function () {
        assert.deepEqual(convert('new ObjectID("58c33a794d08b991e3648fd2")'), {
          $oid: '58c33a794d08b991e3648fd2',
        });
      });

      it('should support NumberLong', function () {
        assert.deepEqual(convert('NumberLong("1234567890")'), {
          $numberLong: '1234567890',
        });
      });

      it('should support NumberLong > MAX_SAFE_INTEGER', function () {
        assert.deepEqual(convert('NumberLong("345678654321234552")'), {
          $numberLong: '345678654321234552',
        });
      });

      it('should support new NumberLong', function () {
        assert.deepEqual(convert('new NumberLong("1234567890")'), {
          $numberLong: '1234567890',
        });
      });

      it('should support NumberInt', function () {
        assert.deepEqual(convert('NumberInt("1234567890")'), 1234567890);
      });

      it('should support NumberInt with number', function () {
        assert.deepEqual(convert('NumberInt(1234567890)'), 1234567890);
      });

      it('should support NumberDecimal', function () {
        assert.deepEqual(convert('NumberDecimal("10.99")'), {
          $numberDecimal: '10.99',
        });
      });

      it('should support new NumberDecimal', function () {
        assert.deepEqual(convert('new NumberDecimal("10.99")'), {
          $numberDecimal: '10.99',
        });
      });

      it('should support MixKey', function () {
        assert.deepEqual(convert('MinKey()'), { $minKey: 1 });
      });

      it('should support MaxKey', function () {
        assert.deepEqual(convert('MaxKey()'), { $maxKey: 1 });
      });
    });

    describe('validate', function () {
      context('when the string contains a NumberLong', function () {
        const query = '{value: NumberLong(1)}';
        const parsed = validate('filter', query);
        it('returns the bson long value', function () {
          assert.equal(parsed.value.toNumber(), 1);
        });
      });

      context('when turning off validation', function () {
        context('when the query is a valid object', function () {
          const query = '{value: NumberLong(1)}';
          const parsed = validate('filter', query);

          it('returns truthy', function () {
            assert.equal(parsed.value.toNumber(), 1);
          });
        });

        context('when the query is not a valid object', function () {
          const query = '{value: NumberLong(1)';
          const parsed = validate('filter', query);

          it('returns false', function () {
            assert.equal(parsed, false);
          });
        });
      });
    });
  });

  const usecases = {
    project: [
      { input: '{_id: "a"}', expected: { _id: 'a' } },
      { input: '{_id: "1"}', expected: { _id: '1' } },
      { input: '{grabage', expected: false },
      { input: 'true', expected: false },
      { input: '123', expected: false },
      { input: '"something"', expected: false },
      { input: 'null', expected: false },
      { input: '', expected: null },
      { input: '    ', expected: null },
      { input: '{}', expected: null },
    ],
    collation: [
      { input: '{invalid: "simple"}', expected: false },
      { input: '{locale: ""}', expected: false },
      { input: '{locale: "invalid"}', expected: false },
      { input: '', expected: null },
      { input: '  ', expected: null },
      { input: '{}', expected: null },
      { input: '{locale: "simple"}', expected: { locale: 'simple' } },
      {
        input: '{locale: "en_US", strength: 1}',
        expected: { locale: 'en_US', strength: 1 },
      },
    ],
    hint: [
      { input: '', expected: null },
      { input: '  ', expected: null },
      { input: '{}', expected: null },
      { input: '{_id: 1}', expected: { _id: 1 } },
      { input: '{_id: -1}', expected: { _id: -1 } },
      { input: '{pineapple: 1, age: -1}', expected: { pineapple: 1, age: -1 } },
      { input: '"pineapple"', expected: 'pineapple' },
      { input: "'pineapple'", expected: 'pineapple' },
      { input: '["one", "two"]', expected: false },
      { input: '{pineapple: 0}', expected: { pineapple: 0 } },
      { input: '{pineapple: -1}', expected: { pineapple: -1 } },
      { input: '{pineapple: NaN}', expected: { pineapple: NaN } },
      { input: '{pineapple: 2}', expected: { pineapple: 2 } },
      { input: '{not_pineapple', expected: false },
      { input: 'invalid pineapple: }', expected: false },
      { input: '{invalid pineapple}', expected: false },
      { input: '{invalid pineapple: }', expected: false },
      { input: 'true', expected: false },
      { input: 'pineapple', expected: false },
      { input: '123', expected: false },
      { input: 'null', expected: false },
    ],
    sort: [
      { input: '', expected: null },
      { input: '{_id: 1}', expected: { _id: 1 } },
      { input: '{_id: -1}', expected: { _id: -1 } },
      { input: '{_id: "asc"}', expected: { _id: 'asc' } },
      { input: '{_id: "desc"}', expected: { _id: 'desc' } },
      {
        input: '{ score: { $meta: "textScore" } }',
        expected: {
          score: { $meta: 'textScore' },
        },
      },
      { input: '[["123", -1]]', expected: [['123', -1]] },
      { input: '[["bar", 1]]', expected: [['bar', 1]] },
      { input: '{_id: "a"}', expected: false },
      { input: '{_id: "1"}', expected: false },
      { input: '{grabage', expected: false },
      { input: '[1]', expected: false },
      { input: '["foo"]', expected: false },
      { input: '[["foo", "bar"]]', expected: false },
      { input: '[[123, -1]]', expected: false },
      { input: '', expected: null },
      { input: 'null', expected: null },
      { input: 'undefined', expected: null },
    ],
    skip: [
      { input: '{skip: "a"}', expected: false },
      { input: '0', expected: 0 },
      { input: 1, expected: 1 },
      { input: '   ', expected: DEFAULT_SKIP },
    ],
    limit: [
      { input: '{limit: "a"}', expected: false },
      { input: '0', expected: 0 },
      { input: 1 as any, expected: 1 },
      { input: '   ', expected: DEFAULT_LIMIT },
    ],
    maxTimeMS: [
      { input: '{maxTimeMS: "a"}', expected: false },
      { input: '0', expected: 0 },
      { input: 1 as any, expected: 1 },
      { input: '   ', expected: DEFAULT_MAX_TIME_MS },
    ],
  };

  for (const [key, tests] of Object.entries(usecases)) {
    it(`should validate ${key}`, function () {
      for (const { input, expected } of tests) {
        assert.deepEqual(validate(key, input), expected);
      }
    });
  }
});
