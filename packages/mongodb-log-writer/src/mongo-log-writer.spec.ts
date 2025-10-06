import type { MongoLogEntry } from '.';
import { MongoLogWriter, mongoLogId } from '.';
import { EJSON } from 'bson';
import stream from 'stream';
import { inspect } from 'util';
import chai, { expect } from 'chai';
import sinonChai from 'sinon-chai';
chai.use(sinonChai);

describe('MongoLogWriter', function () {
  it('allows writing log messages to a stream', async function () {
    const now = new Date(1628591965386);
    const target = new stream.PassThrough().setEncoding('utf8');
    const writer = new MongoLogWriter('logid', null, target, () => now);
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
    const writer = new MongoLogWriter('logid', null, target, () => now);
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
    const writer = new MongoLogWriter('logid', null, target, () => now);

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
      const writer = new MongoLogWriter('logid', null, target);
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

  it('flushes pending writes on the MongoLogWriter itself', async function() {
    const chunks: string[] = [];
    const target = new stream.Writable({
      write(chunk, encoding, callback) {
        chunks.push(chunk.toString());
        // Simulate a 'slow' consumer (i.e. one that does actual I/O,
        // as opposed to one that does not do asynchronous work outside
        // of microtask queues (promises, nextTick)
        setImmediate(callback);
      }
    });
    const w = new MongoLogWriter('id', null, target);
    for (let i = 0; i < 5; i++) {
      w.info('component', mongoLogId(0), 'ctx', 'msg', { i });
    }
    await w.flush();
    expect(chunks.map(c => c ? JSON.parse(c).attr.i : c)).to.deep.equal([
      0, 1, 2, 3, 4, ''
    ]);
  });
});
