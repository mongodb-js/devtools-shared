import { expect } from 'chai';
import { BSON } from 'mongodb';
import { fromEjson, toEjson } from './ejson';

describe('ejson', function () {
  it('round-trips BSON types through canonical Extended JSON', function () {
    const value = fromEjson({
      oid: { $oid: '65f0c0ffee00c0ffee00c0ff' },
      date: { $date: '2024-01-01T00:00:00.000Z' },
      long: { $numberLong: '9007199254740993' },
      int: { $numberInt: '42' },
      double: 1.5,
      nested: [{ $oid: '65f0c0ffee00c0ffee00c0ff' }],
    });

    expect(value.oid).to.be.instanceOf(BSON.ObjectId);
    expect(value.date).to.be.instanceOf(Date);
    expect(value.long).to.be.instanceOf(BSON.Long);
    expect(value.nested[0]).to.be.instanceOf(BSON.ObjectId);

    expect(toEjson(value)).to.deep.equal({
      oid: { $oid: '65f0c0ffee00c0ffee00c0ff' },
      date: { $date: { $numberLong: String(Date.UTC(2024, 0, 1)) } },
      long: { $numberLong: '9007199254740993' },
      int: { $numberInt: '42' },
      double: { $numberDouble: '1.5' },
      nested: [{ $oid: '65f0c0ffee00c0ffee00c0ff' }],
    });
  });

  it('accepts plain JSON and returns canonical numbers', function () {
    const value = fromEjson({ a: 1, b: 'x', c: true, d: null });

    expect(toEjson(value)).to.deep.equal({
      a: { $numberInt: '1' },
      b: 'x',
      c: true,
      d: null,
    });
  });
});
