import assert from 'assert';

import { getConventionalBump } from './get-conventional-bump';

describe('getConventionalBump', function () {
  it('returns the correct increment', function () {
    assert.equal(
      getConventionalBump({ subject: 'chore: msg', body: '' }),
      'patch'
    );

    assert.equal(
      getConventionalBump({ subject: 'chore: msg!', body: '' }),
      'patch'
    );

    assert.equal(getConventionalBump({ subject: 'msg', body: '' }), 'patch');

    assert.equal(
      getConventionalBump({ subject: 'style(scope): msg', body: '' }),
      'patch'
    );

    assert.equal(
      getConventionalBump({ subject: 'feat: msg', body: '' }),
      'minor'
    );

    assert.equal(
      getConventionalBump({ subject: 'fix: msg', body: '' }),
      'patch'
    );

    assert.equal(
      getConventionalBump({ subject: 'feat(scope): msg', body: '' }),
      'minor'
    );

    assert.equal(
      getConventionalBump({ subject: 'any!: msg', body: '' }),
      'major'
    );

    assert.equal(
      getConventionalBump({ subject: 'any(scope)!: msg', body: '' }),
      'major'
    );

    assert.equal(
      getConventionalBump({ subject: 'any: msg BREAKING CHANGE', body: '' }),
      'major'
    );

    assert.equal(
      getConventionalBump({ subject: 'any: msg BREAKING CHANGES', body: '' }),
      'major'
    );

    assert.equal(
      getConventionalBump({ subject: 'any: msg', body: '\nBREAKING CHANGE' }),
      'major'
    );

    assert.equal(
      getConventionalBump({ subject: 'any: msg', body: '\nBREAKING CHANGES' }),
      'major'
    );
  });
});
