import assert from 'assert';

import getSchema from '../src';

describe('order of fields', function () {
  it('should have _id fields always at top, even with uppercase fields', async function () {
    const docs = [
      {
        FOO: 1,
        _id: 1,
        BAR: 1,
        zoo: 1,
      },
    ];
    const schema = await getSchema(docs);
    assert.deepEqual(
      schema.fields.map((v) => v.name),
      ['_id', 'BAR', 'FOO', 'zoo'],
    );
  });
  it('should sort keys in case-insensitive manner', async function () {
    const docs = [
      {
        cb: 1,
        Ca: 1,
        cC: 1,
        a: 1,
        b: 1,
      },
    ];
    const schema = await getSchema(docs);
    assert.deepEqual(
      schema.fields.map((v) => v.name),
      ['a', 'b', 'Ca', 'cb', 'cC'],
    );
  });
  it('should keep keys that only differ in case in the order they appear in', async function () {
    // The comparator treats these as equal, so the sort - being stable - has to
    // leave them in the order the documents introduced them in.
    const upperFirst = await getSchema([{ cb: 1, Ca: 1, ca: 1, a: 1 }]);
    assert.deepEqual(
      upperFirst.fields.map((v) => v.name),
      ['a', 'Ca', 'ca', 'cb'],
    );

    const lowerFirst = await getSchema([{ cb: 1, ca: 1, Ca: 1, a: 1 }]);
    assert.deepEqual(
      lowerFirst.fields.map((v) => v.name),
      ['a', 'ca', 'Ca', 'cb'],
    );
  });
});
