import Autocompleter from './index';
import { expect } from 'chai';

const FOO_TS = `

export type Foo = {
    a: string,
    bb: (p1: number) => void
};

export type Params = { param1: string, param2: string };

declare global {
  declare var foo: Foo;
  export function bar(params: Params): void {};
}
`;

describe('Autocompleter', function () {
  let autoCompleter: Autocompleter;

  beforeEach(function () {
    autoCompleter = new Autocompleter();
  });

  it('returns nothing when it has no code', function () {
    expect(autoCompleter.autocomplete('foo')).to.deep.equal([]);
    expect(autoCompleter.autocomplete('foo', 0)).to.deep.equal([]);
    expect(autoCompleter.autocomplete('foo', 1)).to.deep.equal([]);
    expect(autoCompleter.autocomplete('foo.')).to.deep.equal([]);
  });

  it('returns completions for members of global variables', function () {
    autoCompleter.updateCode({
      '/foo.d.ts': FOO_TS,
    });

    expect(autoCompleter.autocomplete('foo')).to.deep.equal([]);
    expect(autoCompleter.autocomplete('foo.')).to.deep.equal([
      { kind: 'property', name: 'a', type: 'string' },
      { kind: 'property', name: 'bb', type: '(p1: number) => void' },
    ]);

    expect(autoCompleter.autocomplete('foo.', 0)).to.deep.equal([]);
    expect(autoCompleter.autocomplete('foo.', 1)).to.deep.equal([]);
    expect(autoCompleter.autocomplete('foo.', 2)).to.deep.equal([]);
    expect(autoCompleter.autocomplete('foo.', 3)).to.deep.equal([]);

    expect(autoCompleter.autocomplete('foo.b')).to.deep.equal([
      { kind: 'property', name: 'a', type: 'string' },
      { kind: 'property', name: 'bb', type: '(p1: number) => void' },
    ]);

    expect(autoCompleter.autocomplete('foo.bar', 4)).to.deep.equal([
      { kind: 'property', name: 'a', type: 'string' },
      { kind: 'property', name: 'bb', type: '(p1: number) => void' },
    ]);
  });

  it('returns completions for the fields of object function parameters', function () {
    autoCompleter.updateCode({
      '/foo.d.ts': FOO_TS,
    });

    expect(autoCompleter.autocomplete('bar({ par')).to.deep.equal([
      {
        kind: 'property',
        name: 'param1',
        type: 'string',
      },
      {
        kind: 'property',
        name: 'param2',
        type: 'string',
      },
    ]);
  });
});
