import assert from 'assert';
import BSON from 'bson';

import getSchema from '../src';

describe('schema analyzer', function () {
  describe('BSON type detection', function () {
    it('treats a plain object with _bsontype as a regular document', async function () {
      const schema = await getSchema([
        { _id: 1, a: { _bsontype: '<b>x</b>' } },
        { _id: 2, a: { _bsontype: 'String' } },
        { _id: 3, a: { _bsontype: 'Binary', other: 1 } },
      ]);
      const a = schema.fields.find((f) => f.name === 'a');
      assert.deepStrictEqual(a?.type, 'Document');
    });

    it('still detects real BSON values', async function () {
      const schema = await getSchema([
        { _id: new BSON.ObjectId(), n: BSON.Long.fromNumber(1) },
      ]);
      assert.deepStrictEqual(
        schema.fields.map((f) => f.type),
        ['ObjectId', 'Long'],
      );
    });

    it('detects BSON values that have no bson version symbol', async function () {
      const legacyLong = Object.defineProperty(
        { low: 1, high: 0 },
        '_bsontype',
        {
          value: 'Long',
        },
      );
      const schema = await getSchema([{ n: legacyLong }]);
      assert.deepStrictEqual(schema.fields[0].type, 'Long');
    });

    it('detects BSON values by the bson version symbol', async function () {
      const value = {
        _bsontype: 'Long',
        low: 1,
        high: 0,
        [Symbol.for('@@mdb.bson.version')]: 7,
      };
      const schema = await getSchema([{ n: value }]);
      assert.deepStrictEqual(schema.fields[0].type, 'Long');
    });
  });
});
