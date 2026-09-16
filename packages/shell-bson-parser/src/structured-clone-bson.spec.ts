import * as bson from 'bson';
import { expect } from 'chai';

import {
  serializeBsonValues,
  deserializeBsonValues,
} from './structured-clone-bson';

function roundTrip<T>(value: T): T {
  return deserializeBsonValues(structuredClone(serializeBsonValues(value)));
}

describe('structured-clone-bson', function () {
  const bsonValues: [string, unknown][] = [
    ['ObjectId', new bson.ObjectId('5e159ba7eac34211f2252aaa')],
    ['Long', bson.Long.fromNumber(123456789)],
    ['unsigned Long', bson.Long.fromString('18446744073709551615', true)],
    ['Timestamp', new bson.Timestamp({ t: 100, i: 7 })],
    ['Decimal128', bson.Decimal128.fromString('1.5')],
    ['Double', new bson.Double(10.1)],
    ['Int32', new bson.Int32(10)],
    ['Code', new bson.Code('function() {}')],
    [
      'Code with scope',
      new bson.Code('function() {}', { x: new bson.ObjectId() }),
    ],
    ['Binary', new bson.Binary(Buffer.from('dGVzdAo=', 'base64'), 3)],
    ['UUID', new bson.UUID('3d37923d-ab8e-4931-9e46-93df5fd3599e')],
    ['empty Binary', new bson.Binary()],
    ['DBRef', new bson.DBRef('tests', new bson.ObjectId(), 'db', { a: 1 })],
    ['BSONRegExp', new bson.BSONRegExp('abc', 'i')],
    ['BSONSymbol', new bson.BSONSymbol('sym')],
    ['MaxKey', new bson.MaxKey()],
    ['MinKey', new bson.MinKey()],
  ];

  for (const [title, value] of bsonValues) {
    it(`round-trips ${title}`, function () {
      const result = roundTrip(value);
      expect(result).to.be.instanceOf((value as object).constructor);
      expect(result).to.deep.equal(value);
    });
  }

  it('round-trips plain JS values untouched', function () {
    const value = {
      d: new Date(0),
      r: /a/g,
      n: 1,
      s: 'str',
      u: undefined,
      nul: null,
      big: 10n,
      nan: NaN,
      arr: [1, 'two', [3]],
    };
    expect(roundTrip(value)).to.deep.equal(value);
  });

  it('round-trips BSON nested in arrays, objects and Map', function () {
    const oid = new bson.ObjectId();
    const value = {
      arr: [oid, { deep: [bson.Long.fromNumber(1)] }],
      map: new Map<string, unknown>([['k', oid]]),
    };
    const result = roundTrip(value);
    expect(result).to.deep.equal(value);
    expect(result.map.get('k')).to.be.instanceOf(bson.ObjectId);
  });

  it('keeps `__proto__` and `constructor` as own keys', function () {
    const value = JSON.parse('{"__proto__": {"x": 1}, "constructor": 1}');
    const result = roundTrip(value);
    expect(Object.keys(result)).to.deep.equal(['__proto__', 'constructor']);
    expect(Object.getPrototypeOf(result)).to.equal(Object.prototype);
  });

  it('throws on unknown serialized types', function () {
    expect(() =>
      deserializeBsonValues({
        __bson_serialized__: true,
        type: 'Nope',
        props: {},
      }),
    ).to.throw(/unknown BSON type/);
  });

  it('converts Uint8Array back into Buffer', function () {
    const result = deserializeBsonValues({ b: new Uint8Array([1, 2]) });
    expect(Buffer.isBuffer(result.b)).to.equal(true);
  });
});
