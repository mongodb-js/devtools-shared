import { expect } from 'chai';
import type { Completion } from './filter';
import { wrapField, getFilteredCompletions, ALL_CONSTANTS } from './filter';
import semver from 'semver';
import util from 'util';

describe('completer', function () {
  const simpleConstants: Completion[] = [
    { value: 'foo', version: '0.0.0', meta: 'stage' },
    { value: 'Foo', version: '0.0.0', meta: 'stage' },
    { value: 'bar', version: '1.0.0', meta: 'accumulator' },
    { value: 'buz', version: '2.0.0', meta: 'expr:array' },
    { value: 'barbar', version: '2.3.0', meta: 'expr:bool' },
    {
      value: 'meow',
      version: '>=2.0.0 <3.0.0 || >=3.5.0',
      meta: 'expr:set',
    },
    {
      value: 'woof',
      version: '>=0.200.300 <0.200.301',
      meta: 'accumulator',
    },
    {
      value: 'honk',
      version: '999.999.999',
      meta: 'variable:system',
    },
  ];

  function getFilteredValues(
    ...args: Parameters<typeof getFilteredCompletions>
  ): string[] {
    return getFilteredCompletions(args[0], args[1] ?? simpleConstants).map(
      (completion) => completion.value
    );
  }

  it('should return results filtered by server version', function () {
    expect(getFilteredValues({ serverVersion: '1.0.0' })).to.deep.eq([
      'foo',
      'Foo',
      'bar',
    ]);
  });

  it('should clean up version before comparing', function () {
    expect(getFilteredValues({ serverVersion: '0.200.300-alpha0' })).to.deep.eq(
      ['foo', 'Foo', 'woof']
    );
    expect(getFilteredValues({ serverVersion: '0.0.0---what???' })).to.deep.eq([
      'foo',
      'Foo',
    ]);
  });

  it('should correctly use range version filter', function () {
    expect(getFilteredValues({ serverVersion: '2.0.0' })).to.include('meow');
    expect(getFilteredValues({ serverVersion: '3.6.0' })).to.include('meow');
    expect(getFilteredValues({ serverVersion: '3.0.0' })).to.not.include(
      'meow'
    );
  });

  it('should use default version when provided version is not valid', function () {
    expect(
      getFilteredValues({ serverVersion: 'one dot one dot zero' })
    ).to.deep.eq(['foo', 'Foo', 'bar', 'buz', 'barbar', 'meow', 'honk']);
    expect(getFilteredValues({ serverVersion: '1.2' })).to.deep.eq([
      'foo',
      'Foo',
      'bar',
      'buz',
      'barbar',
      'meow',
      'honk',
    ]);
  });

  it('should return results filtered by meta', function () {
    expect(getFilteredValues({ meta: ['stage', 'accumulator'] })).to.deep.eq([
      'foo',
      'Foo',
      'bar',
    ]);
    expect(getFilteredValues({ meta: ['expr:*'] })).to.deep.eq([
      'buz',
      'barbar',
      'meow',
    ]);
  });

  describe('stage filter', function () {
    const stageConstants: Completion[] = [
      {
        value: '$a',
        version: '0.0.0',
        meta: 'stage',
        env: ['adl'],
        namespaces: ['database'],
        apiVersions: [],
      },
      {
        value: '$b',
        version: '0.0.0',
        meta: 'stage',
        env: ['on-prem'],
        namespaces: ['collection'],
        apiVersions: [],
      },
      {
        value: '$c',
        version: '0.0.0',
        meta: 'stage',
        env: ['atlas'],
        namespaces: ['timeseries'],
        apiVersions: [1],
      },
    ];

    it('should return all constants when stage filters are not provided', function () {
      expect(getFilteredValues({}, stageConstants)).to.deep.eq([
        '$a',
        '$b',
        '$c',
      ]);
    });

    it('should filter stages by env', function () {
      expect(
        getFilteredValues({ stage: { env: ['adl', 'atlas'] } }, stageConstants)
      ).to.deep.eq(['$a', '$c']);
    });

    it('should filter stages by namespace', function () {
      expect(
        getFilteredValues(
          { stage: { namespace: 'collection' } },
          stageConstants
        )
      ).to.deep.eq(['$b']);
    });

    it('should filter stages by apiVersion', function () {
      expect(
        getFilteredValues({ stage: { apiVersion: 1 } }, stageConstants)
      ).to.deep.eq(['$c']);
    });
  });

  it('should keep field description when provided', function () {
    const completions = getFilteredCompletions(
      {
        meta: ['field:identifier'],
        fields: [
          { name: 'foo', description: 'ObjectId' },
          { name: 'bar', description: 'Int32' },
        ],
      },
      []
    ).map((completion) => {
      return {
        value: completion.value,
        description: completion.description,
      };
    });
    expect(completions).to.deep.eq([
      { value: 'foo', description: 'ObjectId' },
      { value: 'bar', description: 'Int32' },
    ]);
  });

  describe('wrapField', function () {
    it('should leave identifier as-is if its roughly valid', function () {
      expect(wrapField('foo')).to.eq('foo');
      expect(wrapField('bar_buz')).to.eq('bar_buz');
      expect(wrapField('$something')).to.eq('$something');
      expect(wrapField('_or_other')).to.eq('_or_other');
      expect(wrapField('number1')).to.eq('number1');
    });

    it("should wrap field in quotes when it's rougly not a valid js identifier", function () {
      expect(wrapField('123foobar')).to.eq('"123foobar"');
      expect(wrapField('bar@buz')).to.eq('"bar@buz"');
      expect(wrapField('foo bar')).to.eq('"foo bar"');
      expect(wrapField('with.a.dot')).to.eq('"with.a.dot"');
      expect(wrapField('bla; process.exit(1); var foo')).to.eq(
        '"bla; process.exit(1); var foo"'
      );
      expect(wrapField('quotes"in"the"middle')).to.eq(
        '"quotes\\"in\\"the\\"middle"'
      );
    });
  });

  describe('all completions', function () {
    it('should have valid semver version or range specified', function () {
      ALL_CONSTANTS.forEach(({ name, version }) => {
        const errMessage = `Expected completion ${util.inspect({
          name,
          version,
        })} to have valid version`;

        try {
          expect(semver.valid(version)).to.not.eq(null, errMessage);
        } catch {
          expect(semver.validRange(version)).to.not.eq(null, errMessage);
        }
      });
    });
  });
});
