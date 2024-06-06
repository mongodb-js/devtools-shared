// /* eslint-disable mocha/max-top-level-suites */
// import assert from 'assert';
// import bson from 'bson';

// import {
//   parseFilter,
// } from './index';
// import {
//   stringify,
//   toJSString,
// } from './stringify';

// describe('toJSString', function () {
//   it('should default to two spaces', function () {
//     assert.equal(
//       toJSString({ a: { $exists: true } }),
//       `{
// a: {
//   $exists: true
// }
// }`
//     );
//   });

//   it('should allow falsy indentation', function () {
//     assert.equal(
//       toJSString({ a: { $exists: true } }, 0),
//       '{a:{$exists:true}}'
//     );
//   });

//   it('allows passing custom indent', function () {
//     assert.equal(
//       toJSString({ a: { $exists: true } }, 'pineapple'),
//       `{
// pineapplea: {
// pineapplepineapple$exists: true
// pineapple}
// }`
//     );
//   });

//   it('retains double spaces and new lines in strings', function () {
//     assert.equal(
//       toJSString(
//         {
//           a: {
//             name: `multi-line with s  p    a   c

// e  s`,
//           },
//         },
//         0
//       ),
//       "{a:{name:'multi-line with s  p    a   c\\n        \\ne  s'}}"
//     );
//   });
// });

// describe('stringify', function () {
//   it('should work', function () {
//     const res = parseFilter('{_id: ObjectId("58c33a794d08b991e3648fd2")}');
//     const stringified = stringify(res);
//     assert.equal(stringified, "{_id: ObjectId('58c33a794d08b991e3648fd2')}");
//   });
//   it('should not added extra space when nesting', function () {
//     assert.equal(stringify({ a: { $exists: true } }), '{a: {$exists: true}}');
//   });

//   // stringify is now deprecated as a result of this.
//   it('changes multi-space values', function () {
//     assert.equal(
//       stringify({
//         a: {
//           name: `multi-line with s  p    a   c

// e  s`,
//         },
//       }),
//       "{a: {name: 'multi-line with s p a c\\n \\ne s'}}"
//     );
//   });

//   context('when providing a long', function () {
//     it('correctly converts to NumberLong', function () {
//       const stringified = stringify({ test: bson.Long.fromNumber(5) });
//       assert.equal(stringified, "{test: NumberLong('5')}");
//     });
//   });

//   context('when providing a decimal128', function () {
//     it('correctly converts to NumberDecimal', function () {
//       const stringified = stringify({
//         test: bson.Decimal128.fromString('5.5'),
//       });
//       assert.equal(stringified, "{test: NumberDecimal('5.5')}");
//     });
//   });

//   context('when providing an int32', function () {
//     it('correctly converts to Int32', function () {
//       const stringified = stringify({
//         test: new bson.Int32(123),
//       });
//       assert.equal(stringified, "{test: NumberInt('123')}");
//     });
//   });

//   context('when providing a Double', function () {
//     it('correctly converts to Double', function () {
//       const stringified = stringify({
//         test: new bson.Double(0.8),
//       });
//       assert.equal(stringified, "{test: Double('0.8')}");
//     });
//   });

//   context('when providing a geo query', function () {
//     const query = {
//       coordinates: {
//         $geoWithin: {
//           $centerSphere: [[-79, 28], 0.04],
//         },
//       },
//     };

//     it('correctly replaces nested tabs with single spaces', function () {
//       const stringified = stringify(query);
//       assert.equal(
//         stringified,
//         '{coordinates: {$geoWithin: { $centerSphere: [ [ -79, 28 ], 0.04 ]}}}'
//       );
//     });
//   });

//   context('when providing a Date', function () {
//     it('correctly converts to an ISODate', function () {
//       const res = parseFilter("{test: new Date('2017-01-01T12:35:31.000Z')}");
//       const stringified = stringify(res);
//       assert.equal(
//         stringified,
//         "{test: ISODate('2017-01-01T12:35:31.000Z')}"
//       );
//     });

//     it('fallbacks to an invalid ISODate if the provided Date is invalid', function () {
//       const res = parseFilter("{test: new Date('invalid')}");
//       const stringified = stringify(res);
//       assert.equal(stringified, "{test: ISODate('Invalid Date')}");
//     });
//   });

//   context('when providing an ISODate', function () {
//     it('correctly converts to an ISODate', function () {
//       const res = parseFilter("{test: ISODate('2017-01-01T12:35:31.000Z')}");
//       const stringified = stringify(res);
//       assert.equal(
//         stringified,
//         "{test: ISODate('2017-01-01T12:35:31.000Z')}"
//       );
//     });

//     it('fallbacks to an invalid ISODate if the provided ISODate is invalid', function () {
//       const res = parseFilter("{test: ISODate('invalid')}");
//       const stringified = stringify(res);
//       assert.equal(stringified, "{test: ISODate('Invalid Date')}");
//     });
//   });

//   context('when providing a DBRef with (collection, oid)', function () {
//     it('correctly converts to a DBRef', function () {
//       const res = parseFilter("{dbref: DBRef('col', 1)}");
//       const stringified = stringify(res);
//       assert.equal(stringified, "{dbref: DBRef('col', '1')}");
//     });
//   });

//   context('when providing a DBRef with (db.collection, oid)', function () {
//     it('correctly converts to a DBRef', function () {
//       const res = parseFilter("{dbref: DBRef('db.col', 1)}");
//       const stringified = stringify(res);
//       assert.equal(stringified, "{dbref: DBRef('col', '1', 'db')}");
//     });
//   });

//   context('when providing a DBRef with (collection, oid, db)', function () {
//     it('correctly converts to a DBRef', function () {
//       const res = parseFilter("{dbref: DBRef('col', 1, 'db')}");
//       const stringified = stringify(res);
//       assert.equal(stringified, "{dbref: DBRef('col', '1', 'db')}");
//     });
//   });

//   context.only('when provided a RegExp', function () {
//     it('correctly formats the options', function () {
//       const res = parseFilter('{name: /foo/i}');
//       console.log('straight string res', res);
//       const stringified = stringify(res);
//       assert.equal(stringified, '{name: RegExp("foo", \'i\')}');
//     });

//     it('escapes quotes', function () {
//       const res = parseFilter("{name: /'/}");
//       const stringified = stringify(res);
//       assert.equal(stringified, '{name: RegExp("\'")}');
//     });

//     it('handles $regex format', function () {
//       const res = parseFilter('{"name": {"$regex": "pineapple", "$options": "i"}}');
//       const stringified = stringify(res);
//       assert.equal(stringified, '{name: RegExp("pineapple", \'i\')}');
//     });

//     it('handles $regularExpression format', function () {
//       const res = {
//         name: {
//           "$regularExpression": {
//             "pattern":"pineapple",
//             "options":"i"
//           }
//         }
//       };
//       // const res = parseFilter('{"name": {"$regularExpression":{"pattern":"pineapple","options":"i"}}}');
//       const stringified = stringify(res);
//       assert.equal(stringified, '{name: RegExp("pineapple", \'i\')}');
//     });
//   });

//   context('when provided a Binary', function () {
//     it('should support BinData', function () {
//       const res = parseFilter(
//         `{name: new BinData(${bson.Binary.SUBTYPE_BYTE_ARRAY}, "OyQRAeK7QlWMr0E2xWapYg==")}`
//       );
//       const stringified = stringify(res);
//       assert.equal(
//         stringified,
//         `{name: BinData(${bson.Binary.SUBTYPE_BYTE_ARRAY}, 'OyQRAeK7QlWMr0E2xWapYg==')}`
//       );
//     });

//     it('should support UUID', function () {
//       const res = parseFilter(
//         '{name: UUID("3b241101-e2bb-4255-8caf-4136c566a962")}'
//       );
//       const stringified = stringify(res);
//       assert.equal(
//         stringified,
//         "{name: UUID('3b241101-e2bb-4255-8caf-4136c566a962')}"
//       );
//     });
//   });
// });
