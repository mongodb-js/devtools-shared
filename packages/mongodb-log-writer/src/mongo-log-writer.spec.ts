import type { MongoLogEntry } from '.';
import { MongoLogWriter, mongoLogId } from '.';
import { EJSON } from 'bson';
import stream from 'stream';
import { once } from 'events';
import { inspect } from 'util';
import chai, { expect } from 'chai';
import sinonChai from 'sinon-chai';
import sinon from 'sinon';
chai.use(sinonChai);

describe('MongoLogWriter', function () {
  const now = new Date(1628591965386);

  describe('enabling and disabling', function () {
    let writer: MongoLogWriter;
    let target: stream.PassThrough;
    let writeSpy: sinon.SinonSpy;

    const SEVERITIES_COUNT = 5;

    function logAllSeverities(writer: MongoLogWriter) {
      writer.info('component', mongoLogId(12345), 'context', 'message', {});
      writer.warn('component', mongoLogId(12345), 'context', 'message', {});
      writer.error('component', mongoLogId(12345), 'context', 'message', {});
      writer.debug('component', mongoLogId(12345), 'context', 'message', {});
      writer.fatal('component', mongoLogId(12345), 'context', 'message', {});
    }

    beforeEach(function () {
      target = new stream.PassThrough().setEncoding('utf8');
      writer = new MongoLogWriter({
        logId: 'logid',
        logFilePath: null,
        target,
        now: () => now,
      });
      writeSpy = sinon.spy(writer, 'write');
    });

    afterEach(async function () {
      writer.end();
      await once(writer, 'finish');
      sinon.restore();
    });

    it('is enabled by default', async function () {
      expect(writer.isDisabled).to.equal(false);

      writer.info('component', mongoLogId(12345), 'context', 'message', {});

      await writer.flush();

      expect(target.read()).is.not.null;
      expect(writeSpy).callCount(1);
    });

    it('can be disabled on initialization', async function () {
      const disabledWriter = new MongoLogWriter({
        logId: 'logid',
        logFilePath: null,
        target,
        now: () => now,
        isDisabled: true,
      });

      expect(disabledWriter.isDisabled).to.equal(true);
      logAllSeverities(disabledWriter);

      await disabledWriter.flush();

      expect(target.read()).is.null;
      expect(writeSpy).not.called;
    });

    it('can run disable() to disable logging across all severities', function () {
      expect(writer.isDisabled).to.equal(false);

      logAllSeverities(writer);

      expect(writeSpy).callCount(SEVERITIES_COUNT);

      writer.disable();

      expect(writer.isDisabled).to.equal(true);

      logAllSeverities(writer);

      expect(writeSpy).callCount(SEVERITIES_COUNT);
    });

    it('can run enable() after being disabled', async function () {
      expect(writer.isDisabled).to.equal(false);

      writer.disable();
      expect(writer.isDisabled).to.equal(true);

      logAllSeverities(writer);

      expect(writeSpy).not.called;

      writer.enable();
      expect(writer.isDisabled).to.equal(false);

      logAllSeverities(writer);

      await writer.flush();

      expect(target.read()).not.null;
      expect(writeSpy).callCount(SEVERITIES_COUNT);
    });
  });

  it('allows writing log messages to a stream', async function () {
    const target = new stream.PassThrough().setEncoding('utf8');
    const writer = new MongoLogWriter({
      logId: 'logid',
      logFilePath: null,
      target,
      now: () => now,
    });
    const logEvents: MongoLogEntry[] = [];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    writer.on('log', (entry) => logEvents.push(entry));
    expect(writer.target).to.equal(target);
    writer.info('component', mongoLogId(12345), 'context', 'message', {
      foo: 'bar',
    });
    writer.warn('component', mongoLogId(12345), 'context', 'message', {
      foo: 'bar',
    });
    writer.error('component', mongoLogId(12345), 'context', 'message', {
      foo: 'bar',
    });
    writer.fatal('component', mongoLogId(12345), 'context', 'message', {
      foo: 'bar',
    });
    writer.debug(
      'component',
      mongoLogId(12345),
      'context',
      'message',
      { foo: 'bar' },
      2
    );
    writer.write({
      t: now,
      s: 'E',
      c: 'x',
      id: mongoLogId(0),
      ctx: 'y',
      msg: 'z',
    });
    await writer.flush();
    const log = target
      .read()
      .split('\n')
      .filter(Boolean)
      .map((line: string) => JSON.parse(line));
    expect(log).to.deep.equal(EJSON.serialize(logEvents));
    expect(log).to.deep.equal([
      {
        t: { $date: '2021-08-10T10:39:25.386Z' },
        s: 'I',
        c: 'component',
        id: 12345,
        ctx: 'context',
        msg: 'message',
        attr: { foo: 'bar' },
      },
      {
        t: { $date: '2021-08-10T10:39:25.386Z' },
        s: 'W',
        c: 'component',
        id: 12345,
        ctx: 'context',
        msg: 'message',
        attr: { foo: 'bar' },
      },
      {
        t: { $date: '2021-08-10T10:39:25.386Z' },
        s: 'E',
        c: 'component',
        id: 12345,
        ctx: 'context',
        msg: 'message',
        attr: { foo: 'bar' },
      },
      {
        t: { $date: '2021-08-10T10:39:25.386Z' },
        s: 'F',
        c: 'component',
        id: 12345,
        ctx: 'context',
        msg: 'message',
        attr: { foo: 'bar' },
      },
      {
        t: { $date: '2021-08-10T10:39:25.386Z' },
        s: 'D2',
        c: 'component',
        id: 12345,
        ctx: 'context',
        msg: 'message',
        attr: { foo: 'bar' },
      },
      {
        t: { $date: '2021-08-10T10:39:25.386Z' },
        s: 'E',
        c: 'x',
        id: 0,
        ctx: 'y',
        msg: 'z',
      },
    ]);
  });

  it('can log error object as data as-is', async function () {
    const now = new Date(1628591965386);
    const target = new stream.PassThrough().setEncoding('utf8');
    const writer = new MongoLogWriter({
      logId: 'logid',
      logFilePath: null,
      target,
      now: () => now,
    });
    writer.error(
      'component',
      mongoLogId(12345),
      'context',
      'message',
      new Error('foo')
    );
    await writer.flush();
    const log = target
      .read()
      .split('\n')
      .filter(Boolean)
      .map((line: string) => JSON.parse(line));
    log[0].attr.stack = '';
    expect(log[0].attr).to.deep.equal({
      code: null,
      message: 'foo',
      name: 'Error',
      stack: '',
    });
  });

  it('can log non-trivial data', async function () {
    const now = new Date(1628591965386);
    const target = new stream.PassThrough().setEncoding('utf8');
    const writer = new MongoLogWriter({
      logId: 'logid',
      logFilePath: null,
      target,
      now: () => now,
    });

    const cyclic: any = {};
    cyclic.cyclic = cyclic;
    writer.error('component', mongoLogId(12345), 'context', 'message', cyclic);

    await writer.flush();
    const log = target
      .read()
      .split('\n')
      .filter(Boolean)
      .map((line: string) => JSON.parse(line).attr);
    expect(log).to.deep.equal([
      {
        _inspected: inspect(cyclic),
      },
    ]);
  });

  it('rejects invalid messages', async function () {
    const errors: Error[] = [];
    function tryWrite(input: any) {
      const target = new stream.PassThrough().setEncoding('utf8');
      const writer = new MongoLogWriter({
        logId: 'logid',
        logFilePath: null,
        target,
      });
      writer.on('error', (err) => errors.push(err));
      writer.write(input);
    }
    tryWrite({});
    tryWrite({ s: 'E' });
    tryWrite({ s: 'E', c: '' });
    tryWrite({ s: 'E', c: '', id: mongoLogId(0) });
    tryWrite({ s: 'E', c: '', id: mongoLogId(0), ctx: '' });
    tryWrite({ s: 'E', c: '', id: mongoLogId(0), ctx: '', msg: '' });

    await new Promise(setImmediate);
    expect(errors).to.have.lengthOf(5);
    expect(new Set([...errors.map((err) => err.name)])).to.deep.equal(
      new Set(['TypeError'])
    );
  });
});
