import { expect } from 'chai';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { EventEmitter } from 'events';
import type { ChildProcess } from 'child_process';
import { tailFileUntilExit } from './tail-file';

describe('tailFileUntilExit', function () {
  let tmpDir: string;
  let file: string;

  beforeEach(async function () {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tail-file-'));
    file = path.join(tmpDir, 'out.log');
    await fs.writeFile(file, '');
  });

  afterEach(async function () {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  function fakeProc(): ChildProcess & EventEmitter {
    return Object.assign(new EventEmitter(), {
      exitCode: null,
      signalCode: null,
    }) as unknown as ChildProcess & EventEmitter;
  }

  it('yields existing and later-appended data, and ends after exit', async function () {
    const proc = fakeProc();
    await fs.writeFile(file, 'one\n');
    const stream = tailFileUntilExit(file, proc);

    const chunks: string[] = [];
    const done = (async () => {
      for await (const chunk of stream) chunks.push(chunk as string);
    })();

    await new Promise((resolve) => setTimeout(resolve, 100));
    await fs.appendFile(file, 'two\n');
    await new Promise((resolve) => setTimeout(resolve, 100));
    // Written right before exit: must still be delivered.
    await fs.appendFile(file, 'three\n');
    proc.emit('exit', 0, null);
    await done;

    expect(chunks.join(''), 'all data is read before ending').to.equal(
      'one\ntwo\nthree\n',
    );
  });

  it('ends immediately for an already-exited process once drained', async function () {
    const proc = fakeProc();
    (proc as any).exitCode = 1;
    await fs.writeFile(file, 'bye\n');

    let data = '';
    for await (const chunk of tailFileUntilExit(file, proc)) {
      data += chunk as string;
    }
    expect(data, 'data is still delivered').to.equal('bye\n');
  });
});
