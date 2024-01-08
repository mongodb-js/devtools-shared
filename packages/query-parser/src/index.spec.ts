import assert from 'assert';
import sinon from 'sinon';
import bson from 'bson';
import _debug from 'debug';

import {
  isCollationValid,
  isFilterValid,
  isLimitValid,
  isMaxTimeMSValid,
  isProjectValid,
  isSkipValid,
  isSortValid,
  parseCollation,
  parseFilter,
  parseProject,
  parseSort,
  stringify,
  DEFAULT_LIMIT,
  DEFAULT_MAX_TIME_MS,
  DEFAULT_SKIP,
  validate,
} from './index';

const debug = _debug('mongodb-query-parser:test');

function convert(string: string) {
  const res = parseFilter(string);
  const ret = bson.EJSON.serialize(res, { legacy: true, relaxed: false });
  debug('converted', { input: string, parsed: res, encoded: ret });
  return ret;
}

describe('mongodb-query-parser', function () {
  describe('filter', function () {
    context('when no new keyword is provided', function () {
      it('returns the filter', function () {
        const res = parseFilter('{_id: ObjectId("58c33a794d08b991e3648fd2")}');
        assert.deepEqual(res, {
          _id: new bson.ObjectId('58c33a794d08b991e3648fd2'),
        });
      });
    });

    context('when a new keyword is provided', function () {
      it('returns the filter', function () {
        const res = parseFilter(
          '{_id: new ObjectId("58c33a794d08b991e3648fd2")}'
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
            `new BinData(${bson.Binary.SUBTYPE_BYTE_ARRAY}, "OyQRAeK7QlWMr0E2xWapYg==")`
          ),
          {
            $binary: 'OyQRAeK7QlWMr0E2xWapYg==',
            $type: `0${bson.Binary.SUBTYPE_BYTE_ARRAY}`,
          }
        );
      });

      it('should support UUID', function () {
        assert.deepEqual(
          convert('UUID("3b241101-e2bb-4255-8caf-4136c566a962")'),
          {
            $binary: 'OyQRAeK7QlWMr0E2xWapYg==',
            $type: `0${bson.Binary.SUBTYPE_UUID}`,
          }
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
          }`
          ),
          {
            $expr: {
              $function: {
                body: 'function(name) { return hex_md5(name) == "15b0a220baa16331e8d80e15367677ad"; }',
                args: ['$name'],
                lang: 'js',
              },
            },
          }
        );

        assert.deepEqual(
          convert('{$match: function() { return this.x === 2; }}'),
          {
            $match: 'function() { return this.x === 2; }',
          }
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
        assert.deepEqual(convert('NumberInt("1234567890")'), {
          $numberInt: '1234567890',
        });
      });

      it('should support NumberInt with number', function () {
        assert.deepEqual(convert('NumberInt(1234567890)'), {
          $numberInt: '1234567890',
        });
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
  });

  describe('isFilterValid', function () {
    context('when the string contains a NumberLong', function () {
      const query = '{value: NumberLong(1)}';
      const parsed = isFilterValid(query);
      it('returns the bson long value', function () {
        assert.equal(parsed.value.toNumber(), 1);
      });
    });

    context('when turning off validation', function () {
      context('when the query is a valid object', function () {
        const query = '{value: NumberLong(1)}';
        const parsed = isFilterValid(query);

        it('returns truthy', function () {
          assert.equal(parsed.value.toNumber(), 1);
        });
      });

      context('when the query is not a valid object', function () {
        const query = '{value: NumberLong(1)';
        const parsed = isFilterValid(query);

        it('returns false', function () {
          assert.equal(parsed, false);
        });
      });
    });
  });

  describe('stringify', function () {
    it('should work', function () {
      const res = parseFilter('{_id: ObjectId("58c33a794d08b991e3648fd2")}');
      const stringified = stringify(res);
      assert.equal(stringified, "{_id: ObjectId('58c33a794d08b991e3648fd2')}");
    });
    it('should not added extra space when nesting', function () {
      assert.equal(stringify({ a: { $exists: true } }), '{a: {$exists: true}}');
    });

    context('when providing a long', function () {
      it('correctly converts to NumberLong', function () {
        const stringified = stringify({ test: bson.Long.fromNumber(5) });
        assert.equal(stringified, '{test: NumberLong(5)}');
      });
    });

    context('when providing a decimal128', function () {
      it('correctly converts to NumberDecimal', function () {
        const stringified = stringify({
          test: bson.Decimal128.fromString('5.5'),
        });
        assert.equal(stringified, "{test: NumberDecimal('5.5')}");
      });
    });

    context('when providing an int32', function () {
      it('correctly converts to Int32', function () {
        const stringified = stringify({
          test: new bson.Int32(123),
        });
        assert.equal(stringified, "{test: NumberInt('123')}");
      });
    });

    context('when providing a Double', function () {
      it('correctly converts to Double', function () {
        const stringified = stringify({
          test: new bson.Double(0.8),
        });
        assert.equal(stringified, "{test: Double('0.8')}");
      });
    });

    context('when providing a geo query', function () {
      const query = {
        coordinates: {
          $geoWithin: {
            $centerSphere: [[-79, 28], 0.04],
          },
        },
      };

      it('correctly replaces nested tabs with single spaces', function () {
        const stringified = stringify(query);
        assert.equal(
          stringified,
          '{coordinates: {$geoWithin: { $centerSphere: [ [ -79, 28 ], 0.04 ]}}}'
        );
      });
    });

    context('when providing a Date', function () {
      it('correctly converts to an ISODate', function () {
        const res = parseFilter("{test: new Date('2017-01-01T12:35:31.000Z')}");
        const stringified = stringify(res);
        assert.equal(
          stringified,
          "{test: ISODate('2017-01-01T12:35:31.000Z')}"
        );
      });

      it('fallbacks to an invalid ISODate if the provided Date is invalid', function () {
        const res = parseFilter("{test: new Date('invalid')}");
        const stringified = stringify(res);
        assert.equal(stringified, "{test: ISODate('Invalid Date')}");
      });
    });

    context('when providing an ISODate', function () {
      it('correctly converts to an ISODate', function () {
        const res = parseFilter("{test: ISODate('2017-01-01T12:35:31.000Z')}");
        const stringified = stringify(res);
        assert.equal(
          stringified,
          "{test: ISODate('2017-01-01T12:35:31.000Z')}"
        );
      });

      it('fallbacks to an invalid ISODate if the provided ISODate is invalid', function () {
        const res = parseFilter("{test: ISODate('invalid')}");
        const stringified = stringify(res);
        assert.equal(stringified, "{test: ISODate('Invalid Date')}");
      });
    });

    context('when providing a DBRef with (collection, oid)', function () {
      it('correctly converts to a DBRef', function () {
        const res = parseFilter("{dbref: DBRef('col', 1)}");
        const stringified = stringify(res);
        assert.equal(stringified, "{dbref: DBRef('col', '1')}");
      });
    });

    context('when providing a DBRef with (db.collection, oid)', function () {
      it('correctly converts to a DBRef', function () {
        const res = parseFilter("{dbref: DBRef('db.col', 1)}");
        const stringified = stringify(res);
        assert.equal(stringified, "{dbref: DBRef('col', '1', 'db')}");
      });
    });

    context('when providing a DBRef with (collection, oid, db)', function () {
      it('correctly converts to a DBRef', function () {
        const res = parseFilter("{dbref: DBRef('col', 1, 'db')}");
        const stringified = stringify(res);
        assert.equal(stringified, "{dbref: DBRef('col', '1', 'db')}");
      });
    });

    context('when provided a RegExp', function () {
      it('correctly formats the options', function () {
        const res = parseFilter('{name: /foo/i}');
        const stringified = stringify(res);
        assert.equal(stringified, '{name: RegExp("foo", \'i\')}');
      });

      it('escapes quotes', function () {
        const res = parseFilter("{name: /'/}");
        const stringified = stringify(res);
        assert.equal(stringified, '{name: RegExp("\'")}');
      });
    });

    context('when provided a Binary', function () {
      it('should support BinData', function () {
        const res = parseFilter(
          `{name: new BinData(${bson.Binary.SUBTYPE_BYTE_ARRAY}, "OyQRAeK7QlWMr0E2xWapYg==")}`
        );
        const stringified = stringify(res);
        assert.equal(
          stringified,
          `{name: BinData(${bson.Binary.SUBTYPE_BYTE_ARRAY}, 'OyQRAeK7QlWMr0E2xWapYg==')}`
        );
      });

      it('should support UUID', function () {
        const res = parseFilter(
          '{name: UUID("3b241101-e2bb-4255-8caf-4136c566a962")}'
        );
        const stringified = stringify(res);
        assert.equal(
          stringified,
          "{name: UUID('3b241101-e2bb-4255-8caf-4136c566a962')}"
        );
      });
    });
  });

  describe('project', function () {
    it('should default to null', function () {
      assert.equal(parseProject(''), null);
      assert.equal(parseProject('      '), null);
      assert.equal(parseProject('{}'), null);
    });
    it('should parse valid project strings', function () {
      assert.deepEqual(parseProject('{_id: 1}'), { _id: 1 });
      assert.deepEqual(parseProject('{_id: -1}'), { _id: -1 });
      assert.deepEqual(parseProject('{comments: { $slice: -1 }}'), {
        comments: { $slice: -1 },
      });
    });
    it('should allow any project strings', function () {
      assert.deepEqual(isProjectValid('{_id: "a"}'), { _id: 'a' });
      assert.deepEqual(isProjectValid('{_id: "1"}'), { _id: '1' });
    });
    it('should reject broken project strings', function () {
      assert.equal(isProjectValid('{grabage'), false);
    });
    it('should reject non object project values', function () {
      assert.equal(isProjectValid('true'), false);
      assert.equal(isProjectValid('123'), false);
      assert.equal(isProjectValid('"something"'), false);
      assert.equal(isProjectValid('null'), false);
    });
  });

  describe('collation', function () {
    it('should default to null', function () {
      assert.equal(parseCollation(''), null);
      assert.equal(parseCollation('      '), null);
      assert.equal(parseCollation('{}'), null);
    });
    it('should parse valid collation strings', function () {
      assert.deepEqual(parseCollation('{locale: "simple"}'), {
        locale: 'simple',
      });
      assert.deepEqual(parseCollation('{locale: "en_US", strength: 1}'), {
        locale: 'en_US',
        strength: 1,
      });
    });
    it('should detect invalid collation strings', function () {
      assert.equal(isCollationValid('{invalid: "simple"}'), false);
      assert.equal(isCollationValid('{locale: ""}'), false);
      assert.equal(isCollationValid('{locale: "invalid"}'), false);
    });
  });

  describe('sort', function () {
    it('should default to null', function () {
      assert.equal(parseSort(''), null);
      assert.equal(parseSort('      '), null);
      assert.equal(parseSort('{}'), null);
    });
    it('should work', function () {
      assert.deepEqual(parseSort('{_id: 1}'), { _id: 1 });
      assert.deepEqual(parseSort('{_id: -1}'), { _id: -1 });
    });
    it('should allow objects and arrays as values', function () {
      assert.deepEqual(isSortValid(''), null);
      assert.deepEqual(isSortValid('{_id: 1}'), { _id: 1 });
      assert.deepEqual(isSortValid('{_id: -1}'), { _id: -1 });
      assert.deepEqual(isSortValid('{_id: "asc"}'), { _id: 'asc' });
      assert.deepEqual(isSortValid('{_id: "desc"}'), { _id: 'desc' });
      assert.deepEqual(isSortValid('{ score: { $meta: "textScore" } }'), {
        score: { $meta: 'textScore' },
      });
      assert.deepEqual(isSortValid('[["123", -1]]'), [['123', -1]]);
      assert.deepEqual(isSortValid('[["bar", 1]]'), [['bar', 1]]);
    });
    it('should reject unsupported sort values', function () {
      assert.equal(isSortValid('{_id: "a"}'), false);
      assert.equal(isSortValid('{_id: "1"}'), false);
      assert.equal(isSortValid('{grabage'), false);
      assert.equal(isSortValid('[1]'), false);
      assert.equal(isSortValid('["foo"]'), false);
      assert.equal(isSortValid('[["foo", "bar"]]'), false);
      assert.equal(isSortValid('[[123, -1]]'), false);
    });
    it('should handle empty, null, and undefined', function () {
      assert.equal(isSortValid(''), null);
      assert.equal(isSortValid('null'), null);
      assert.equal(isSortValid('undefined'), null);
    });
  });

  describe('skip', function () {
    it('should work', function () {
      assert.equal(isSkipValid('{skip: "a"}'), false);
      assert.equal(isSkipValid('0'), 0);
      assert.equal(isSkipValid(1), 1);
      assert.equal(isSkipValid('   '), DEFAULT_SKIP);
    });
  });

  describe('limit', function () {
    it('should work', function () {
      assert.equal(isLimitValid('{limit: "a"}'), false);
      assert.equal(isLimitValid('0'), 0);
      assert.equal(isLimitValid(1), 1);
      assert.equal(isLimitValid('   '), DEFAULT_LIMIT);
    });
  });

  describe('maxTimeMS', function () {
    it('Validates as a number', function () {
      assert.equal(isMaxTimeMSValid('{maxTimeMS: "a"}'), false);
      assert.equal(isMaxTimeMSValid('0'), 0);
      assert.equal(isMaxTimeMSValid(1), 1);
      assert.equal(isMaxTimeMSValid('   '), DEFAULT_MAX_TIME_MS);
    });
  });

  describe('validate', function () {
    it('calls the other validation functions', function () {
      assert.deepEqual(isSortValid(''), null);
      assert.deepEqual(validate('sort', ''), null);
      assert.deepEqual(validate('Sort', ''), null);
      assert.deepEqual(validate('sort', '[["123", -1]]'), [['123', -1]]);
      assert.deepEqual(validate('limit', '   '), DEFAULT_LIMIT);
    });
  });
});
