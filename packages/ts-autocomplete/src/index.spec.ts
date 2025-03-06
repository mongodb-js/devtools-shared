import Autocompleter from './index';
import { expect } from 'chai';

describe('Autocompleter', function () {
  let autoCompleter: Autocompleter;

  beforeEach(function () {
    autoCompleter = new Autocompleter();
  });

  it('returns nothing when it has no code', function () {
    expect(autoCompleter.autocomplete('foo')).to.deep.equal([]);
    expect(autoCompleter.autocomplete('foo', 0)).to.deep.equal([]);
    expect(autoCompleter.autocomplete('foo', 1)).to.deep.equal([]);
  });

  it('returns completions when it knows of some code', function () {
    autoCompleter.updateCode({
      'foo.ts': `
export type Foo = {
    a: string,
    bb: function (p1: number) {}
};

  declare global {
    declare var foo: Foo;
  }
    `,
    });

    expect(autoCompleter.autocomplete('foo')).to.deep.equal([]);
    expect(autoCompleter.autocomplete('foo.')).to.deep.equal([
      { kind: 'property', name: 'a', type: 'string' },
      { kind: 'property', name: 'bb', type: 'function (p1: number)' },
    ]);

    expect(autoCompleter.autocomplete('foo.', 0)).to.deep.equal([]);
    expect(autoCompleter.autocomplete('foo.', 1)).to.deep.equal([]);
    expect(autoCompleter.autocomplete('foo.', 2)).to.deep.equal([]);
    expect(autoCompleter.autocomplete('foo.', 3)).to.deep.equal([]);

    // TODO: is this expected?
    expect(autoCompleter.autocomplete('fo')).to.deep.equal([]);

    // TODO: is this expected?
    expect(autoCompleter.autocomplete('foo.b')).to.deep.equal([
      { kind: 'property', name: 'a', type: 'string' },
      { kind: 'property', name: 'bb', type: 'function (p1: number)' },
    ]);

    expect(autoCompleter.autocomplete('foo.bar', 4)).to.deep.equal([
      { kind: 'property', name: 'a', type: 'string' },
      { kind: 'property', name: 'bb', type: 'function (p1: number)' },
    ]);
  });
});
