import path from 'path';
import { promises as fs } from 'fs';
import Autocompleter from './index';
import { expect } from 'chai';

function filterStartingWith({
  name,
  trigger,
}: {
  name: string;
  trigger: string;
}): boolean {
  name = name.toLocaleLowerCase();
  trigger = trigger.toLocaleLowerCase();

  return name !== trigger && name.startsWith(trigger);
}

describe('Autocompleter', function () {
  let CODE_TS: string;

  before(async function () {
    CODE_TS = await fs.readFile(
      path.resolve(__dirname, '..', 'test', 'fixtures', 'code.ts'),
      'utf8'
    );
  });

  describe('without filter', function () {
    let autoCompleter: Autocompleter;

    beforeEach(function () {
      autoCompleter = new Autocompleter();
    });

    it('returns the global scope for a global variable that does not exist', function () {
      autoCompleter.updateCode({
        '/code.d.ts': CODE_TS,
      });

      const completions = autoCompleter.autocomplete('doesNotExist');
      expect(completions.length).to.be.gt(100);
    });

    it('returns completions for global variables', function () {
      autoCompleter.updateCode({
        '/code.d.ts': CODE_TS,
      });

      // this is just the entire global scope
      const completions = autoCompleter.autocomplete('myGlobalFunct');

      expect(completions.length).to.be.gt(100);

      // one of them is the myGlobalFunction() function
      expect(completions).to.deep.include({
        kind: 'function',
        name: 'myGlobalFunction',
        type: 'myGlobalFunction',
      });
    });

    it('returns nothing for a member of a variable that does not exist', function () {
      autoCompleter.updateCode({
        '/code.d.ts': CODE_TS,
      });

      expect(
        autoCompleter.autocomplete('doesNotExist.somethingElse')
      ).to.deep.equal([]);
    });

    it('returns matches for a member of a variable that exists', function () {
      autoCompleter.updateCode({
        '/code.d.ts': CODE_TS,
      });

      expect(autoCompleter.autocomplete('myGlobalObject.')).to.deep.equal([
        {
          kind: 'property',
          name: 'functionProp',
          type: '(p1: number) => void',
        },
        { kind: 'property', name: 'stringProp', type: 'string' },
      ]);
    });

    it('returns matches for part of a member of a variable that exists', function () {
      autoCompleter.updateCode({
        '/code.d.ts': CODE_TS,
      });

      expect(autoCompleter.autocomplete('myGlobalObject.str')).to.deep.equal([
        {
          kind: 'property',
          name: 'functionProp',
          type: '(p1: number) => void',
        },
        { kind: 'property', name: 'stringProp', type: 'string' },
      ]);
    });

    it('returns matches for an unknown member of a variable that exists', function () {
      autoCompleter.updateCode({
        '/code.d.ts': CODE_TS,
      });

      expect(
        autoCompleter.autocomplete('myGlobalObject.doesNotExist')
      ).to.deep.equal([
        {
          kind: 'property',
          name: 'functionProp',
          type: '(p1: number) => void',
        },
        { kind: 'property', name: 'stringProp', type: 'string' },
      ]);
    });

    it('returns the global scope for object parameters of a function that does not exist', function () {
      autoCompleter.updateCode({
        '/code.d.ts': CODE_TS,
      });

      const completions = autoCompleter.autocomplete('doesNotExist({');

      expect(completions.length).to.be.gt(100);
    });

    it('returns matches for object parameters of a function that exists', function () {
      autoCompleter.updateCode({
        '/code.d.ts': CODE_TS,
      });

      const completions = autoCompleter.autocomplete('myGlobalFunction({ p');

      expect(completions).to.deep.equal([
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

    it('returns matches for part of an object parameter of a function that exists', function () {
      autoCompleter.updateCode({
        '/code.d.ts': CODE_TS,
      });

      const completions = autoCompleter.autocomplete('myGlobalFunction({ p');

      expect(completions).to.deep.equal([
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

    it('returns matches for an unknown object parameter of a function that exists', function () {
      autoCompleter.updateCode({
        '/code.d.ts': CODE_TS,
      });

      const completions = autoCompleter.autocomplete(
        'myGlobalFunction({ doesNotExist'
      );
      expect(completions).to.deep.equal([
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

  describe('with filter', function () {
    let autoCompleter: Autocompleter;

    beforeEach(function () {
      autoCompleter = new Autocompleter({ filter: filterStartingWith });
    });

    it('returns nothing when it has no code', function () {
      expect(autoCompleter.autocomplete('myGlobalOb')).to.deep.equal([]);
      expect(autoCompleter.autocomplete('myGlobalObject')).to.deep.equal([]);
      expect(autoCompleter.autocomplete('myGlobalObject', 0)).to.deep.equal([]);
      expect(autoCompleter.autocomplete('myGlobalObject', 1)).to.deep.equal([]);
      expect(autoCompleter.autocomplete('myGlobalObject.')).to.deep.equal([]);
    });

    it('returns completions for global variables', function () {
      autoCompleter.updateCode({
        '/code.d.ts': CODE_TS,
      });

      // it finds the entire global scope and then filters it
      expect(autoCompleter.autocomplete('myGlobalFunct')).to.deep.equal([
        {
          kind: 'function',
          name: 'myGlobalFunction',
          type: 'myGlobalFunction',
        },
      ]);
    });

    it('returns completions for members of global variables', function () {
      autoCompleter.updateCode({
        '/code.d.ts': CODE_TS,
      });

      expect(autoCompleter.autocomplete('myGlobalObject')).to.deep.equal([]);
      expect(autoCompleter.autocomplete('myGlobalObject.')).to.deep.equal([
        {
          kind: 'property',
          name: 'functionProp',
          type: '(p1: number) => void',
        },
        { kind: 'property', name: 'stringProp', type: 'string' },
      ]);

      expect(autoCompleter.autocomplete('myGlobalObject.', 0)).to.deep.equal(
        []
      );
      expect(autoCompleter.autocomplete('myGlobalObject.', 1)).to.deep.equal(
        []
      );
      expect(autoCompleter.autocomplete('myGlobalObject.', 2)).to.deep.equal(
        []
      );
      expect(autoCompleter.autocomplete('myGlobalObject.', 3)).to.deep.equal(
        []
      );

      expect(
        autoCompleter.autocomplete('myGlobalObject.functionPr')
      ).to.deep.equal([
        {
          kind: 'property',
          name: 'functionProp',
          type: '(p1: number) => void',
        },
      ]);

      expect(
        autoCompleter.autocomplete('myGlobalObject.typo', 4)
      ).to.deep.equal([]);
    });

    it('returns completions for the fields of object function parameters', function () {
      autoCompleter.updateCode({
        '/code.d.ts': CODE_TS,
      });

      expect(
        autoCompleter.autocomplete('myGlobalFunction({ par')
      ).to.deep.equal([
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
});
