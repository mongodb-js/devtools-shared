import assert from 'assert';
import bson from 'bson';
import { queryParser } from './validators';
import { toJSString } from './stringify';

describe('stringify', function () {
  describe('toJSString', function () {
    it('should default to two spaces', function () {
      assert.equal(
        toJSString({ a: { $exists: true } }),
        `{
  a: {
    $exists: true
  }
}`,
      );
    });

    it('should allow falsy indentation', function () {
      assert.equal(
        toJSString({ a: { $exists: true } }, 0),
        '{a:{$exists:true}}',
      );
    });

    it('allows passing custom indent', function () {
      assert.equal(
        toJSString({ a: { $exists: true } }, 'pineapple'),
        `{
pineapplea: {
pineapplepineapple$exists: true
pineapple}
}`,
      );
    });

    it('retains double spaces and new lines in strings', function () {
      assert.equal(
        toJSString(
          {
            a: {
              name: `multi-line with s  p    a   c
        
e  s`,
            },
          },
          0,
        ),
        "{a:{name:'multi-line with s  p    a   c\\n        \\ne  s'}}",
      );
    });

    it('escapes quotes, backslashes and newlines in Code', function () {
      const code = `a "b" 'c' \\d\ne`;
      const jsString = toJSString({ a: new bson.Code(code) }) as string;
      assert.deepEqual(queryParser(jsString), {
        a: new bson.Code(code),
      });
    });

    it('escapes Code with a scope', function () {
      const code = `');process.exit(1);('`;
      const jsString = toJSString({
        a: new bson.Code(code, { b: 1 }),
      }) as string;
      assert.deepEqual(queryParser(jsString), {
        a: new bson.Code(code, { b: 1 }),
      });
    });

    describe('DBRef', function () {
      // The bson types say `oid` is an ObjectId, but a DBRef oid can hold any
      // BSON value in practice, which is what we want to cover here.
      const dbRef = (
        collection: string,
        oid: unknown,
        db?: string,
        fields?: Record<string, unknown>,
      ) => new bson.DBRef(collection, oid as bson.ObjectId, db, fields);

      it('preserves the oid type rather than flattening it to a string', function () {
        assert.equal(
          toJSString({ a: dbRef('col', 1) }, 0),
          '{a:DBRef("col", 1)}',
        );
        assert.equal(
          toJSString({ a: dbRef('col', 'abc') }, 0),
          '{a:DBRef("col", \'abc\')}',
        );
        assert.equal(
          toJSString(
            { a: dbRef('col', new bson.ObjectId('507f191e810c19729de860ea')) },
            0,
          ),
          '{a:DBRef("col", ObjectId(\'507f191e810c19729de860ea\'))}',
        );
      });

      it('includes the db when present', function () {
        assert.equal(
          toJSString({ a: dbRef('col', 1, 'db') }, 0),
          '{a:DBRef("col", 1, "db")}',
        );
      });

      it('includes the fields when present', function () {
        assert.equal(
          toJSString({ a: dbRef('col', 1, 'db', { b: 1 }) }, 0),
          '{a:DBRef("col", 1, "db", {b:1})}',
        );
      });

      it('passes an undefined db when fields are present without one', function () {
        assert.equal(
          toJSString({ a: dbRef('col', 1, undefined, { b: 1 }) }, 0),
          '{a:DBRef("col", 1, undefined, {b:1})}',
        );
      });

      it('omits empty fields', function () {
        assert.equal(
          toJSString({ a: dbRef('col', 1, undefined, {}) }, 0),
          '{a:DBRef("col", 1)}',
        );
      });

      it('preserves BSON types inside fields', function () {
        assert.equal(
          toJSString(
            {
              a: dbRef('col', 1, 'db', {
                b: new bson.ObjectId('507f191e810c19729de860ea'),
              }),
            },
            0,
          ),
          '{a:DBRef("col", 1, "db", {b:ObjectId(\'507f191e810c19729de860ea\')})}',
        );
      });

      it('escapes quotes in the collection and db', function () {
        assert.equal(
          toJSString({ a: dbRef("co'l", 1, 'd"b') }, 0),
          '{a:DBRef("co\'l", 1, "d\\"b")}',
        );
      });

      const roundTrips: [string, bson.DBRef][] = [
        ['numeric oid', dbRef('col', 1)],
        ['string oid', dbRef('col', 'abc')],
        [
          'ObjectId oid',
          dbRef('col', new bson.ObjectId('507f191e810c19729de860ea')),
        ],
        ['db', dbRef('col', 1, 'db')],
        ['quotes', dbRef("co'l", 1, 'd"b')],
        ['double spaces', dbRef('a  b', 1)],
        ['newline', dbRef('a\nb', 1)],
        ['nested DBRef oid', dbRef('col', dbRef('inner', 1), 'db')],
        ['fields', dbRef('col', 1, 'db', { b: 1 })],
        ['fields but no db', dbRef('col', 1, undefined, { b: 1 })],
        [
          'BSON values in fields',
          dbRef('col', 1, 'db', {
            b: new bson.ObjectId('507f191e810c19729de860ea'),
          }),
        ],
      ];

      for (const [name, dbref] of roundTrips) {
        it(`round-trips a DBRef with ${name}`, function () {
          const jsString = toJSString({ a: dbref }, 0) as string;
          assert.deepEqual(queryParser(jsString), { a: dbref });
        });
      }
    });
  });
  describe('toJSString with indent 0', function () {
    const compactStringify = (obj: unknown) => toJSString(obj, 0);

    it('should work', function () {
      const res = queryParser('{_id: ObjectId("58c33a794d08b991e3648fd2")}');
      assert.equal(
        compactStringify(res),
        "{_id:ObjectId('58c33a794d08b991e3648fd2')}",
      );
    });
    it('should not add extra space when nesting', function () {
      assert.equal(
        compactStringify({ a: { $exists: true } }),
        '{a:{$exists:true}}',
      );
    });

    it('preserves multi-space and newline values', function () {
      assert.equal(
        compactStringify({
          a: {
            name: `multi-line with s  p    a   c
        
e  s`,
          },
        }),
        "{a:{name:'multi-line with s  p    a   c\\n        \\ne  s'}}",
      );
    });

    context('when providing a long', function () {
      it('correctly converts to NumberLong', function () {
        assert.equal(
          compactStringify({ test: bson.Long.fromNumber(5) }),
          "{test:NumberLong('5')}",
        );

        assert.equal(
          compactStringify({ test: new bson.Long('123456789123456789') }),
          "{test:NumberLong('123456789123456789')}",
        );
      });
    });

    context('when providing a decimal128', function () {
      it('correctly converts to NumberDecimal', function () {
        assert.equal(
          compactStringify({ test: bson.Decimal128.fromString('5.5') }),
          "{test:NumberDecimal('5.5')}",
        );
      });
    });

    context('when providing an int32', function () {
      it('correctly converts to Int32', function () {
        assert.equal(
          compactStringify({ test: new bson.Int32(123) }),
          "{test:NumberInt('123')}",
        );
      });
    });

    context('when providing a Double', function () {
      it('correctly converts to Double', function () {
        assert.equal(
          compactStringify({ test: new bson.Double(0.8) }),
          "{test:Double('0.8')}",
        );
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

      it('does not add any whitespace', function () {
        assert.equal(
          compactStringify(query),
          '{coordinates:{$geoWithin:{$centerSphere:[[-79,28],0.04]}}}',
        );
      });
    });

    context('when providing a Date', function () {
      it('correctly converts to an ISODate', function () {
        const res = queryParser("{test: new Date('2017-01-01T12:35:31.000Z')}");
        assert.equal(
          compactStringify(res),
          "{test:ISODate('2017-01-01T12:35:31.000Z')}",
        );
      });

      it('falls back to an invalid ISODate if the provided Date is invalid', function () {
        const res = queryParser("{test: new Date('invalid')}");
        assert.equal(compactStringify(res), "{test:ISODate('Invalid Date')}");
      });
    });

    context('when providing an ISODate', function () {
      it('correctly converts to an ISODate', function () {
        const res = queryParser("{test: ISODate('2017-01-01T12:35:31.000Z')}");
        assert.equal(
          compactStringify(res),
          "{test:ISODate('2017-01-01T12:35:31.000Z')}",
        );
      });

      it('throws if the provided ISODate is invalid', function () {
        assert.throws(
          () => queryParser("{test: ISODate('invalid')}"),
          /"invalid" is not a valid ISODate/,
        );
      });
    });

    context('when providing a DBRef with (collection, oid)', function () {
      it('correctly converts to a DBRef', function () {
        const res = queryParser("{dbref: DBRef('col', 1)}");
        assert.equal(compactStringify(res), '{dbref:DBRef("col", 1)}');
      });
    });

    context('when providing a DBRef with (db.collection, oid)', function () {
      it('correctly converts to a DBRef', function () {
        const res = queryParser("{dbref: DBRef('db.col', 1)}");
        assert.equal(compactStringify(res), '{dbref:DBRef("col", 1, "db")}');
      });
    });

    context('when providing a DBRef with (collection, oid, db)', function () {
      it('correctly converts to a DBRef', function () {
        const res = queryParser("{dbref: DBRef('col', 1, 'db')}");
        assert.equal(compactStringify(res), '{dbref:DBRef("col", 1, "db")}');
      });
    });

    context('when provided a RegExp', function () {
      it('correctly formats the options', function () {
        const res = queryParser('{name: /foo/i}');
        assert.equal(compactStringify(res), '{name:RegExp("foo", \'i\')}');
      });

      it('escapes quotes', function () {
        const res = queryParser("{name: /'/}");
        assert.equal(compactStringify(res), '{name:RegExp("\'")}');
      });

      it('handles $regex object format (keeps format)', function () {
        const res = queryParser(
          '{"name": {"$regex": "pineapple", "$options": "i"}}',
        );
        assert.equal(
          compactStringify(res),
          "{name:{$regex:'pineapple',$options:'i'}}",
        );
      });

      it('handles /regex/ format', function () {
        const res = {
          name: /pineapple/,
        };
        assert.equal(compactStringify(res), '{name:RegExp("pineapple")}');
      });
    });

    context('when provided a BSONRegExp', function () {
      it('stringifies correctly with options', function () {
        const res = {
          name: new bson.BSONRegExp('pineapple', 'i'),
        };
        assert.equal(
          compactStringify(res),
          '{name:RegExp("pineapple", \'i\')}',
        );
      });

      it('stringifies correctly with quotes', function () {
        const res = {
          name: new bson.BSONRegExp('"\'', 'i'),
        };
        assert.equal(compactStringify(res), '{name:RegExp("\\"\'", \'i\')}');
      });

      it('stringifies correctly without options', function () {
        const res = {
          name: new bson.BSONRegExp('pineapple'),
        };
        assert.equal(compactStringify(res), '{name:RegExp("pineapple")}');
      });

      it('stringifies into BSONRegExp when js RegExp cannot handle an option', function () {
        const res = {
          name: new bson.BSONRegExp(
            'pineapple',
            'x' /* x flag is not valid in js but valid in BSONRegExp*/,
          ),
        };
        assert.equal(
          compactStringify(res),
          '{name:BSONRegExp("pineapple", \'x\')}',
        );
      });

      it('stringifies into BSONRegExp when js RegExp cannot handle the regex', function () {
        const res = {
          name: new bson.BSONRegExp(
            // Perl Compatible Regular Expressions supported feature that isn't in regular
            // js RegExp: case-insensitive match.
            '(?i)a(?-i)cme',
            'i',
          ),
        };
        assert.equal(
          compactStringify(res),
          '{name:BSONRegExp("(?i)a(?-i)cme", \'i\')}',
        );
      });
    });

    context('when provided a Binary', function () {
      it('should support BinData', function () {
        const res = queryParser(
          `{name: new BinData(${bson.Binary.SUBTYPE_BYTE_ARRAY}, "OyQRAeK7QlWMr0E2xWapYg==")}`,
        );
        assert.equal(
          compactStringify(res),
          `{name:BinData(${bson.Binary.SUBTYPE_BYTE_ARRAY}, 'OyQRAeK7QlWMr0E2xWapYg==')}`,
        );
      });

      it('should support UUID', function () {
        const res = queryParser(
          '{name: UUID("3b241101-e2bb-4255-8caf-4136c566a962")}',
        );
        assert.equal(
          compactStringify(res),
          "{name:UUID('3b241101-e2bb-4255-8caf-4136c566a962')}",
        );
      });

      it('does not convert LegacyJavaUUID to UUID', function () {
        const res = queryParser(
          '{name: LegacyJavaUUID("00112233-4455-6677-8899-aabbccddeeff")}',
        );
        assert.equal(
          compactStringify(res),
          "{name:BinData(3, 'd2ZVRDMiEQD/7t3Mu6qZiA==')}",
        );
      });

      it('does not convert LegacyCSharpUUID to UUID', function () {
        const res = queryParser(
          '{name: LegacyCSharpUUID("00112233-4455-6677-8899-aabbccddeeff")}',
        );
        assert.equal(
          compactStringify(res),
          "{name:BinData(3, 'MyIRAFVEd2aImaq7zN3u/w==')}",
        );
      });

      it('does not convert LegacyPythonUUID to UUID', function () {
        const res = queryParser(
          '{name: LegacyPythonUUID("00112233-4455-6677-8899-aabbccddeeff")}',
        );
        assert.equal(
          compactStringify(res),
          "{name:BinData(3, 'ABEiM0RVZneImaq7zN3u/w==')}",
        );
      });

      // https://www.mongodb.com/docs/manual/reference/method/Binary.createFromHexString/
      it('should support Binary.createFromHexString', function () {
        const res = queryParser(
          `{name: Binary.createFromHexString("deadbeef", ${bson.Binary.SUBTYPE_BYTE_ARRAY})}`,
        );
        assert.equal(
          compactStringify(res),
          `{name:BinData(${bson.Binary.SUBTYPE_BYTE_ARRAY}, '3q2+7w==')}`,
        );
      });

      // https://www.mongodb.com/docs/manual/reference/method/Binary.createFromBase64/
      it('should support Binary.createFromBase64', function () {
        const res = queryParser(
          `{name: Binary.createFromBase64("3q2+7w==", ${bson.Binary.SUBTYPE_BYTE_ARRAY})}`,
        );
        assert.equal(
          compactStringify(res),
          `{name:BinData(${bson.Binary.SUBTYPE_BYTE_ARRAY}, '3q2+7w==')}`,
        );
      });
    });
  });
});
