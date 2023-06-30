import assert from 'assert';

import { maxIncrement } from './max-increment';

describe('maxIncrement', function () {
  it('returns the correct increment', function () {
    assert.equal(maxIncrement('patch', 'patch'), 'patch');
    assert.equal(maxIncrement('minor', 'minor'), 'minor');
    assert.equal(maxIncrement('major', 'major'), 'major');

    assert.equal(maxIncrement('major', 'patch'), 'major');
    assert.equal(maxIncrement('patch', 'major'), 'major');

    assert.equal(maxIncrement('major', 'minor'), 'major');
    assert.equal(maxIncrement('minor', 'major'), 'major');

    assert.equal(maxIncrement('minor', 'patch'), 'minor');
    assert.equal(maxIncrement('patch', 'minor'), 'minor');

    assert.equal(maxIncrement('patch', null), 'patch');
    assert.equal(maxIncrement('patch', undefined), 'patch');
    assert.equal(maxIncrement(null, 'patch'), 'patch');
    assert.equal(maxIncrement(undefined, 'patch'), 'patch');
  });
});
