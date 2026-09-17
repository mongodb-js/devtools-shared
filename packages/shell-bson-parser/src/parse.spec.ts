import * as bson from 'bson';
import { expect } from 'chai';
import type { SinonSandbox } from 'sinon';
import sinon from 'sinon';
import { parse } from './parse.js';
import type { Options } from './options.js';
import { ParseMode } from './options.js';
import { PARSE_TEST_CASES } from '../test/parse-test-cases.js';

describe('parse', function () {
  for (const { title, input, options, expected } of PARSE_TEST_CASES) {
    it(title, function () {
      expect(parse(input, options)).to.deep.equal(expected);
    });
  }

  it('should create new UUIDs', function () {
    expect(parse('{name: UUID()}'))
      .to.have.property('name')
      .that.is.instanceOf(bson.Binary);
    expect(parse('{name: LegacyCSharpUUID()}'))
      .to.have.property('name')
      .that.is.instanceOf(bson.Binary);
    expect(parse('{name: LegacyJavaUUID()}'))
      .to.have.property('name')
      .that.is.instanceOf(bson.Binary);
    expect(parse('{name: LegacyPythonUUID()}'))
      .to.have.property('name')
      .that.is.instanceOf(bson.Binary);
  });

  describe('with a set UUID generation', function () {
    let sandbox: SinonSandbox;

    beforeEach(function () {
      sandbox = sinon.createSandbox();

      sandbox.replace((bson as any).UUID.prototype, 'toHexString', function () {
        return '00112233-4455-6677-8899-aabbccddeeff';
      });
      sandbox.replace((bson as any).UUID.prototype, 'toBinary', function () {
        return new bson.Binary(
          Buffer.from('00112233445566778899aabbccddeeff', 'hex'),
          4,
        );
      });
    });
    afterEach(function () {
      sandbox.restore();
    });

    it('should create new UUIDs in the correct formats for legacy', function () {
      expect(parse('{name: UUID()}')).to.have.deep.equal({
        name: new bson.Binary(
          Buffer.from('00112233445566778899aabbccddeeff', 'hex'),
          4,
        ),
      });
      expect(parse('{name: LegacyCSharpUUID()}')).to.have.deep.equal({
        name: new bson.Binary(
          Buffer.from('33221100554477668899aabbccddeeff', 'hex'),
          3,
        ),
      });
      expect(parse('{name: LegacyJavaUUID()}')).to.have.deep.equal({
        name: new bson.Binary(
          Buffer.from('7766554433221100ffeeddccbbaa9988', 'hex'),
          3,
        ),
      });
      expect(parse('{name: LegacyPythonUUID()}')).to.have.deep.equal({
        name: new bson.Binary(
          Buffer.from('00112233445566778899aabbccddeeff', 'hex'),
          3,
        ),
      });
    });
  });

  describe('Function calls', function () {
    const options: Partial<Options> = {
      mode: ParseMode.Strict,
      allowMethods: true,
    };

    describe('Date', function () {
      let sandbox: SinonSandbox;

      beforeEach(function () {
        sandbox = sinon.createSandbox();
      });
      afterEach(function () {
        sandbox.restore();
      });

      it('should allow calling .now()', function () {
        const dateSpy = sandbox.stub(Date, 'now');
        dateSpy.returns(1578974885017);

        expect(parse('{ now: Date.now() }', options)).to.deep.equal({
          now: 1578974885017,
        });
      });

      function* isoDateTests(): Iterable<{ dateFn: string; args: any[] }> {
        for (const dateFn of ['new Date', 'new ISODate', 'ISODate']) {
          for (const args of [
            [],
            [0],
            [1234567890000],
            [null],
            ['1996-02-24T23:01:59.001Z'],
          ])
            yield { dateFn, args };
        }
      }

      for (const { dateFn, args } of isoDateTests()) {
        context(
          `Date allow using member methods with "${dateFn}" and args ${JSON.stringify(
            args,
          )}`,
          function () {
            it('should allow member expressions', function () {
              const newDate = `${dateFn}(${args
                .map((val) => JSON.stringify(val))
                .join(',')})`;
              const input = `{
          getDate: (${newDate}).getDate(),
          getDay: (${newDate}).getDay(),
          getFullYear: (${newDate}).getFullYear(),
          getHours: (${newDate}).getHours(),
          getMilliseconds: (${newDate}).getMilliseconds(),
          getMinutes: (${newDate}).getMinutes(),
          getMonth: (${newDate}).getMonth(),
          getSeconds: (${newDate}).getSeconds(),
          getTime: (${newDate}).getTime(),
          getTimezoneOffset: (${newDate}).getTimezoneOffset(),
          getUTCDate: (${newDate}).getUTCDate(),
          getUTCDay: (${newDate}).getUTCDay(),
          getUTCFullYear: (${newDate}).getUTCFullYear(),
          getUTCHours: (${newDate}).getUTCHours(),
          getUTCMilliseconds: (${newDate}).getUTCMilliseconds(),
          getUTCMinutes: (${newDate}).getUTCMinutes(),
          getUTCMonth: (${newDate}).getUTCMonth(),
          getUTCSeconds: (${newDate}).getUTCSeconds(),
          getYear: (${newDate}).getYear(),
          setDate: (${newDate}).setDate(24),
          setFullYear: (${newDate}).setFullYear(2010),
          setHours: (${newDate}).setHours(23),
          setMilliseconds: (${newDate}).setMilliseconds(1),
          setMinutes: (${newDate}).setMinutes(1),
          setMonth: (${newDate}).setMonth(1),
          setSeconds: (${newDate}).setSeconds(59),
          setTime: (${newDate}).setTime(10),
          setUTCDate: (${newDate}).setUTCDate(24),
          setUTCFullYear: (${newDate}).setUTCFullYear(2010),
          setUTCHours: (${newDate}).setUTCHours(23),
          setUTCMilliseconds: (${newDate}).setUTCMilliseconds(1),
          setUTCMinutes: (${newDate}).setUTCMinutes(1),
          setUTCMonth: (${newDate}).setUTCMonth(1),
          setUTCSeconds: (${newDate}).setUTCSeconds(59),
          setYear: (${newDate}).setYear(96),
          toISOString: (${newDate}).toISOString(),
          valueOf: (${newDate}.valueOf()),
       }`;

              const actual = parse(input, options);

              // When constructing a date with no arguments, it will be set to the current date,
              // which is prone to race conditions for millisecond precision.
              const allowedMillisecondDelta = args.length === 0 ? 9 : 0;

              expect(actual.getDate).to.equal(
                new (Date as any)(...args).getDate(),
              );
              expect(actual.getDay).to.equal(
                new (Date as any)(...args).getDay(),
              );
              expect(actual.getFullYear).to.equal(
                new (Date as any)(...args).getFullYear(),
              );
              expect(actual.getHours).to.equal(
                new (Date as any)(...args).getHours(),
              );
              expect(actual.getMilliseconds).to.be.approximately(
                new (Date as any)(...args).getMilliseconds(),
                allowedMillisecondDelta,
              );
              expect(actual.getMinutes).to.equal(
                new (Date as any)(...args).getMinutes(),
              );
              expect(actual.getMonth).to.equal(
                new (Date as any)(...args).getMonth(),
              );
              expect(actual.getSeconds).to.equal(
                new (Date as any)(...args).getSeconds(),
              );
              expect(actual.getTime).to.be.approximately(
                new (Date as any)(...args).getTime(),
                allowedMillisecondDelta,
              );
              expect(actual.getTimezoneOffset).to.equal(
                new (Date as any)(...args).getTimezoneOffset(),
              );
              expect(actual.getUTCDate).to.equal(
                new (Date as any)(...args).getUTCDate(),
              );
              expect(actual.getUTCDay).to.equal(
                new (Date as any)(...args).getUTCDay(),
              );
              expect(actual.getUTCFullYear).to.equal(
                new (Date as any)(...args).getUTCFullYear(),
              );
              expect(actual.getUTCHours).to.equal(
                new (Date as any)(...args).getUTCHours(),
              );
              expect(actual.getUTCMilliseconds).to.be.approximately(
                new (Date as any)(...args).getUTCMilliseconds(),
                allowedMillisecondDelta,
              );
              expect(actual.getUTCMinutes).to.equal(
                new (Date as any)(...args).getUTCMinutes(),
              );
              expect(actual.getUTCMonth).to.equal(
                new (Date as any)(...args).getUTCMonth(),
              );
              expect(actual.getUTCSeconds).to.equal(
                new (Date as any)(...args).getUTCSeconds(),
              );
              expect(actual.getYear).to.equal(
                new (Date as any)(...args).getYear(),
              ); // getYear is deprecated
              expect(actual.setDate).to.be.approximately(
                new (Date as any)(...args).setDate(24),
                allowedMillisecondDelta,
              );
              expect(actual.setFullYear).to.be.approximately(
                new (Date as any)(...args).setFullYear(2010),
                allowedMillisecondDelta,
              );
              expect(actual.setHours).to.be.approximately(
                new (Date as any)(...args).setHours(23),
                allowedMillisecondDelta,
              );
              expect(actual.setMilliseconds).to.be.approximately(
                new (Date as any)(...args).setMilliseconds(1),
                allowedMillisecondDelta,
              );
              expect(actual.setMinutes).to.be.approximately(
                new (Date as any)(...args).setMinutes(1),
                allowedMillisecondDelta,
              );
              expect(actual.setMonth).to.be.approximately(
                new (Date as any)(...args).setMonth(1),
                allowedMillisecondDelta,
              );
              expect(actual.setSeconds).to.be.approximately(
                new (Date as any)(...args).setSeconds(59),
                allowedMillisecondDelta,
              );
              expect(actual.setTime).to.be.approximately(
                new (Date as any)(...args).setTime(10),
                allowedMillisecondDelta,
              );
              expect(actual.setUTCDate).to.be.approximately(
                new (Date as any)(...args).setUTCDate(24),
                allowedMillisecondDelta,
              );
              expect(actual.setUTCFullYear).to.be.approximately(
                new (Date as any)(...args).setUTCFullYear(2010),
                allowedMillisecondDelta,
              );
              expect(actual.setUTCHours).to.be.approximately(
                new (Date as any)(...args).setUTCHours(23),
                allowedMillisecondDelta,
              );
              expect(actual.setUTCMilliseconds).to.be.approximately(
                new (Date as any)(...args).setUTCMilliseconds(1),
                allowedMillisecondDelta,
              );
              expect(actual.setUTCMinutes).to.be.approximately(
                new (Date as any)(...args).setUTCMinutes(1),
                allowedMillisecondDelta,
              );
              expect(actual.setUTCMonth).to.be.approximately(
                new (Date as any)(...args).setUTCMonth(1),
                allowedMillisecondDelta,
              );
              expect(actual.setUTCSeconds).to.be.approximately(
                new (Date as any)(...args).setUTCSeconds(59),
                allowedMillisecondDelta,
              );
              expect(actual.setYear).to.be.approximately(
                new (Date as any)(...args).setYear(96),
                allowedMillisecondDelta,
              ); // setYear is deprecated
              expect(actual.valueOf).to.be.approximately(
                new (Date as any)(...args).valueOf(),
                allowedMillisecondDelta,
              );

              const isoRegex = /^([^.]*\.)([\d]*)(Z)$/;
              const actualMatch = isoRegex.exec(actual.toISOString);
              const expectedMatch = isoRegex.exec(
                new (Date as any)(...args).toISOString(),
              );

              expect(actualMatch?.length).to.equal(4);
              expect(expectedMatch?.length).to.equal(4);

              // Date group - 1970-01-01T00:00:00.
              expect(actualMatch![1]).to.equal(expectedMatch![1]);

              // Millisecond group
              expect(Number.parseInt(actualMatch![2])).to.be.approximately(
                Number.parseInt(expectedMatch![2]),
                allowedMillisecondDelta,
              );

              // Z
              expect(actualMatch![3]).to.equal(expectedMatch![3]);
            });

            it('should prevent invalid functions', function () {
              const input = `{ evilDate: (${dateFn}(0)).totallyLegit(5) }`;
              expect(parse(input, options)).to.equal('');
            });
          },
        );
      }

      it('should return a string if you use Date() without new', function () {
        const isoString = '1996-02-24T23:01:59.001Z';
        const newDate = `Date('${isoString}')`;

        const input = `${newDate}`;

        expect(parse(input, options)).to.include(
          String(new Date().getUTCFullYear()),
        );
      });
    });
  });
});
