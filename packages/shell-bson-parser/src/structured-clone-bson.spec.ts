import * as bson from 'bson';
import { expect } from 'chai';

import {
  serializeBsonValues,
  deserializeBsonValues,
} from './structured-clone-bson.js';

function roundTrip<T>(value: T): T {
  return deserializeBsonValues(structuredClone(serializeBsonValues(value)));
}

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

describe('structured-clone-bson', function () {
  describe('round-trip', function () {
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

    it('restores a plain Binary (sub_type != 4) as Binary, not UUID', function () {
      const bin = new bson.Binary(Buffer.from([1, 2, 3]), 0);
      const result = roundTrip({ b: bin }) as { b: bson.Binary };
      expect(result.b).to.be.instanceOf(bson.Binary);
      expect(result.b).not.to.be.instanceOf(bson.UUID);
    });

    it('restores any Binary with sub_type 4 as UUID, even if it was never actually constructed via `new UUID()`', function () {
      // Documented behavior: the wire format can't distinguish "built via
      // `new UUID()`" from "a plain Binary someone happened to tag sub_type
      // 4" - both are UUIDs by BSON's own definition, so both should come
      // back as UUID.
      const bin = new bson.Binary(Buffer.alloc(16, 7), 4);
      const result = roundTrip({ b: bin }) as { b: bson.Binary };
      expect(result.b).to.be.instanceOf(bson.UUID);
    });

    it('handles a Code value with no scope at all', function () {
      const code = new bson.Code('function () {}');
      // bson's own `Code` constructor defaults `scope` to `null`, not
      // `undefined`, when none is given.
      expect(code.scope).to.equal(null);
      const result = roundTrip({ c: code }) as { c: bson.Code };
      expect(result.c).to.be.instanceOf(bson.Code);
      expect(result.c.scope).to.equal(null);
    });

    it('handles a DBRef with no fields at all', function () {
      const ref = new bson.DBRef('coll', new bson.ObjectId());
      // bson's own `DBRef` constructor defaults `fields` to `{}`, not
      // `undefined`, when none is given.
      expect(ref.fields).to.deep.equal({});
      const result = roundTrip({ ref }) as { ref: bson.DBRef };
      expect(result.ref).to.be.instanceOf(bson.DBRef);
      expect(result.ref.fields).to.deep.equal({});
    });

    it('restores DBRef, including the ObjectId oid and a nested ObjectId in fields', function () {
      const oid = new bson.ObjectId();
      const fieldsId = new bson.ObjectId();
      const ref = new bson.DBRef('coll', oid, 'db', { extra: fieldsId });
      const result = roundTrip({ ref }) as { ref: bson.DBRef };

      expect(result.ref).to.be.instanceOf(bson.DBRef);
      expect(result.ref.collection).to.equal('coll');
      expect(result.ref.db).to.equal('db');
      expect(result.ref.oid).to.be.instanceOf(bson.ObjectId);
      expect(result.ref.oid.toHexString()).to.equal(oid.toHexString());
      expect(result.ref.fields?.extra).to.be.instanceOf(bson.ObjectId);
      expect(
        (result.ref.fields?.extra as bson.ObjectId).toHexString(),
      ).to.equal(fieldsId.toHexString());
    });

    it('restores BSON values nested many levels deep across mixed arrays/objects', function () {
      const id = new bson.ObjectId();
      const input = {
        a: [{ b: { c: [1, 2, { d: { e: [id] } }] } }],
      };

      const result = roundTrip(input);
      const found = result.a[0].b.c[2] as { d: { e: [bson.ObjectId] } };
      expect(found.d.e[0]).to.be.instanceOf(bson.ObjectId);
      expect(found.d.e[0].toHexString()).to.equal(id.toHexString());
    });

    it('restores BSON values found inside a Map, as both key and value', function () {
      const keyId = new bson.ObjectId();
      const valueId = new bson.ObjectId();
      const input = { m: new Map([[keyId, valueId]]) };

      const result = roundTrip(input) as {
        m: Map<bson.ObjectId, bson.ObjectId>;
      };
      expect(result.m).to.be.instanceOf(Map);
      expect(result.m.size).to.equal(1);
      const [[k, v]] = [...result.m];
      expect(k).to.be.instanceOf(bson.ObjectId);
      expect(k.toHexString()).to.equal(keyId.toHexString());
      expect(v).to.be.instanceOf(bson.ObjectId);
      expect(v.toHexString()).to.equal(valueId.toHexString());
    });

    it('restores BSON values found inside a Set', function () {
      const id = new bson.ObjectId();
      const input = { s: new Set([id, 'plain-value']) };

      const result = roundTrip(input) as { s: Set<bson.ObjectId | string> };
      expect(result.s).to.be.instanceOf(Set);
      const values = [...result.s];
      expect(values).to.have.lengthOf(2);
      const restoredId = values.find(
        (v) => v instanceof bson.ObjectId,
      ) as bson.ObjectId;
      expect(restoredId.toHexString()).to.equal(id.toHexString());
      expect(values).to.include('plain-value');
    });

    it('restores BSON values nested inside a Map value that is itself an array/object', function () {
      const id = new bson.ObjectId();
      const input = { m: new Map([['key', { nested: [id] }]]) };

      const result = roundTrip(input) as {
        m: Map<string, { nested: [bson.ObjectId] }>;
      };
      const nested = result.m.get('key');
      expect(nested?.nested[0]).to.be.instanceOf(bson.ObjectId);
      expect(nested?.nested[0].toHexString()).to.equal(id.toHexString());
    });

    it('restores BSON values nested levels, each with a different BSON type', function () {
      const objectId = new bson.ObjectId();
      const dbRefOid = new bson.ObjectId();
      const long = bson.Long.fromNumber(42);
      const decimal = bson.Decimal128.fromString('3.14');

      const input = {
        level1: [
          {
            level2: new Map([
              [
                'key',
                {
                  level3: new Set([
                    objectId,
                    {
                      level4: new bson.DBRef('coll', dbRefOid, undefined, {
                        long,
                        decimal,
                      }),
                    },
                  ]),
                },
              ],
            ]),
          },
        ],
      };

      const result = roundTrip(input);

      expect(result).to.deep.equal(input);

      const [restoredId, { level4 }] = Array.from(
        result.level1[0].level2.get('key')?.level3 ?? [],
      ) as [bson.ObjectId, { level4: bson.DBRef }];

      expect(restoredId.toHexString()).to.equal(objectId.toHexString());
      expect(level4).to.be.instanceOf(bson.DBRef);
      expect(level4.oid.toHexString()).to.equal(dbRefOid.toHexString());
      expect(level4.fields.long).to.be.instanceOf(bson.Long);
      expect((level4.fields.long as bson.Long).toString()).to.equal('42');
      expect(level4.fields.decimal).to.be.instanceOf(bson.Decimal128);
      expect((level4.fields.decimal as bson.Decimal128).toString()).to.equal(
        '3.14',
      );
    });

    it('leaves a raw Buffer/Uint8Array completely untouched', function () {
      const buf = Buffer.from([1, 2, 3]);
      const result = roundTrip({ buf }) as { buf: Uint8Array };
      expect(Buffer.from(result.buf).equals(buf)).to.equal(true);
    });

    it('preserves shared-reference identity for a BSON value reachable via two paths', function () {
      const id = new bson.ObjectId();
      const input = { a: id, b: id };
      const result = roundTrip(input) as { a: bson.ObjectId; b: bson.ObjectId };
      expect(result.a).to.be.instanceOf(bson.ObjectId);
      expect(result.a).to.equal(result.b);
    });

    it('does not hang on a circular reference and preserves the cycle', function () {
      const id = new bson.ObjectId();
      const input: { id: bson.ObjectId; self?: unknown } = Object.assign(
        Object.create(null),
        { id },
      );
      input.self = input;

      const result = roundTrip(input) as { id: bson.ObjectId; self: unknown };
      expect(result.id).to.be.instanceOf(bson.ObjectId);
      expect(result.self).to.equal(result);
    });
  });

  describe('serializeBsonValues', function () {
    it('collects BSON values into a Map keyed by the instance', function () {
      const id = new bson.ObjectId();
      const { bsonTypes } = serializeBsonValues({ _id: id, a: 1 });
      expect(bsonTypes.size).to.equal(1);
      expect(bsonTypes.get(id)).to.equal('ObjectId');
    });

    it('does not collect non-BSON values', function () {
      const { bsonTypes } = serializeBsonValues({ a: 1, b: [1, 2, 3] });
      expect(bsonTypes.size).to.equal(0);
    });

    it('records UUID sub_type 4 as UUID, not Binary', function () {
      const uuid = new bson.UUID();
      const { bsonTypes } = serializeBsonValues({ u: uuid });
      expect(bsonTypes.get(uuid)).to.equal('UUID');
    });

    it('records plain Binary (non-sub_type 4) as Binary', function () {
      const bin = new bson.Binary(Buffer.from([1, 2, 3]), 0);
      const { bsonTypes } = serializeBsonValues({ b: bin });
      expect(bsonTypes.get(bin)).to.equal('Binary');
    });

    it('collects shared references only once', function () {
      const id = new bson.ObjectId();
      const { bsonTypes } = serializeBsonValues({ a: id, b: id });
      expect(bsonTypes.size).to.equal(1);
    });
  });

  describe('deserializeBsonValues', function () {
    it('throws on unknown serialized types', function () {
      const obj = {};
      expect(() =>
        deserializeBsonValues({
          data: obj,
          bsonTypes: new Map([[obj, 'Nope']]),
        }),
      ).to.throw(/unknown BSON type/);
    });
  });
});
