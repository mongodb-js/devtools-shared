import { expect } from 'chai';
import { Readable } from 'stream';
import { createLogEntryIterator } from './mongologreader';

describe('createLogEntryIterator', function () {
  it('skips lines that are not log entries', async function () {
    const json = JSON.stringify({
      t: { $date: '2024-01-01T00:00:00.000Z' },
      s: 'I',
      c: 'NETWORK',
      id: 23016,
      ctx: 'listener',
      msg: 'Waiting for connections',
      attr: { port: 1234 },
    });
    const input = Readable.from([
      `Unable to find image 'mongo' locally\n${json}\n`,
    ]);
    const entries = [];
    for await (const entry of createLogEntryIterator(input)) {
      entries.push(entry);
    }
    expect(entries.map((e) => e.id)).to.deep.equal([23016]);
  });
});
