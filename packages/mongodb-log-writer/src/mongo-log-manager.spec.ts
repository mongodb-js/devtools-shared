import { MongoLogManager, mongoLogId } from '.';
import { ObjectId } from 'bson';
import { once } from 'events';
import type { Stats } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { gunzip, constants as zlibConstants } from 'zlib';
import { promisify } from 'util';
import sinon from 'ts-sinon';
import { expect } from 'chai';

describe('MongoLogManager', function () {
  let directory: string;
  let onwarn: any;
  let onerror: any;
  let retentionDays: number;

  beforeEach(async function () {
    retentionDays = 30;
    onwarn = sinon.stub();
    onerror = sinon.stub();
    directory = path.join(
      os.tmpdir(),
      `log-writer-test-${Math.random()}-${Date.now()}`
    );
    await fs.mkdir(directory, { recursive: true });
  });
  afterEach(async function () {
    await fs.rmdir(directory, { recursive: true });
    sinon.restore();
  });

  it('allows creating and writing to log files', async function () {
    const manager = new MongoLogManager({
      directory,
      retentionDays,
      onwarn,
      onerror,
    });

    const writer = await manager.createLogWriter();
    expect(
      path.relative(directory, writer.logFilePath as string)[0]
    ).to.not.equal('.');
    expect((writer.logFilePath as string).includes(writer.logId)).to.equal(
      true
    );

    writer.info('component', mongoLogId(12345), 'context', 'message', {
      foo: 'bar',
    });
    writer.end();
    await once(writer, 'finish');

    const log = (await fs.readFile(writer.logFilePath as string, 'utf8'))
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    expect(log).to.have.lengthOf(1);
    expect(log[0].t.$date).to.be.a('string');
  });

  it('cleans up old log files when requested', async function () {
    retentionDays = 0.000001; // 86.4 ms
    const manager = new MongoLogManager({
      directory,
      retentionDays,
      onwarn,
      onerror,
    });

    const writer = await manager.createLogWriter();
    writer.info('component', mongoLogId(12345), 'context', 'message', {
      foo: 'bar',
    });
    writer.end();
    await once(writer, 'finish');

    await fs.stat(writer.logFilePath as string);
    await new Promise((resolve) => setTimeout(resolve, 100));
    await manager.cleanupOldLogFiles();
    try {
      await fs.stat(writer.logFilePath as string);
      expect.fail('missed exception');
    } catch (err: any) {
      expect(err.code).to.equal('ENOENT');
    }
  });

  const getFilesState = async (paths: string[]) => {
    return (
      await Promise.all(
        paths.map((path) =>
          fs.stat(path).then(
            () => 1,
            () => 0
          )
        )
      )
    ).join('');
  };

  it('cleans up least recent log files when requested', async function () {
    const manager = new MongoLogManager({
      directory,
      retentionDays,
      maxLogFileCount: 5,
      onwarn,
      onerror,
    });

    const paths: string[] = [];
    const offset = Math.floor(Date.now() / 1000);
    for (let i = 0; i < 10; i++) {
      const filename = path.join(
        directory,
        ObjectId.createFromTime(offset - i).toHexString() + '_log'
      );
      await fs.writeFile(filename, '');
      paths.unshift(filename);
    }

    expect(await getFilesState(paths)).to.equal('1111111111');
    await manager.cleanupOldLogFiles();
    expect(await getFilesState(paths)).to.equal('0000011111');
  });

  it('if fs.stat fails, it errors and is not considered towards the logs limit', async function () {
    const manager = new MongoLogManager({
      directory,
      retentionDays,
      retentionGB: 3,
      onwarn,
      onerror,
    });

    const offset = Math.floor(Date.now() / 1000);

    const faultyFile = path.join(
      directory,
      ObjectId.createFromTime(offset - 10).toHexString() + '_log'
    );
    await fs.writeFile(faultyFile, '');

    const faultyFileError = new Error('test error');

    const validFiles: string[] = [];
    // Create 5 valid files.
    for (let i = 5; i >= 0; i--) {
      const filename = path.join(
        directory,
        ObjectId.createFromTime(offset - i).toHexString() + '_log'
      );
      await fs.writeFile(filename, '');
      validFiles.push(filename);
    }

    expect(onerror).not.called;

    const fsStatStub = sinon.stub(fs, 'stat');

    fsStatStub.resolves({
      size: 1024 * 1024 * 1024,
    } as Stats);
    fsStatStub.withArgs(faultyFile).rejects(faultyFileError);

    await manager.cleanupOldLogFiles();

    expect(onerror).calledOnceWithExactly(faultyFileError, faultyFile);

    // fs.stat is stubbed so getFilesState will not be accurate.
    const leftoverFiles = (await fs.readdir(directory))
      .sort()
      .map((file) => path.join(directory, file));

    expect(leftoverFiles).to.have.lengthOf(4);
    expect(leftoverFiles).deep.equals([faultyFile, ...validFiles.slice(3)]);
  });

  it('cleans up least recent log files when requested with a storage limit', async function () {
    const manager = new MongoLogManager({
      directory,
      retentionDays,
      maxLogFileCount: 1000,
      // 6 KB
      retentionGB: 6 / 1024 / 1024,
      onwarn,
      onerror,
    });

    const paths: string[] = [];
    const offset = Math.floor(Date.now() / 1000);

    // Create 10 files of 1 KB each.
    for (let i = 0; i < 10; i++) {
      const filename = path.join(
        directory,
        ObjectId.createFromTime(offset - i).toHexString() + '_log'
      );
      await fs.writeFile(filename, '0'.repeat(1024));
      paths.unshift(filename);
    }

    expect(await getFilesState(paths)).to.equal('1111111111');
    await manager.cleanupOldLogFiles();
    expect(await getFilesState(paths)).to.equal('0000111111');
  });

  it('cleaning up old log files is a no-op by default', async function () {
    const manager = new MongoLogManager({
      directory: path.join('directory', 'nonexistent'),
      retentionDays,
      onwarn,
      onerror,
    });

    await manager.cleanupOldLogFiles();
  });

  it('creates no-op write streams as a fallback', async function () {
    const manager = new MongoLogManager({
      directory: path.join('directory', 'nonexistent'),
      retentionDays,
      onwarn,
      onerror,
    });

    const writer = await manager.createLogWriter();
    expect(onwarn).to.have.been.calledOnce; // eslint-disable-line
    expect(writer.logFilePath).to.equal(null);

    writer.info('component', mongoLogId(12345), 'context', 'message', {
      foo: 'bar',
    });
    writer.end();
    await once(writer, 'finish');
  });

  it('optionally allow gzip’ed log files', async function () {
    const manager = new MongoLogManager({
      directory,
      retentionDays,
      onwarn,
      onerror,
      gzip: true,
    });

    const writer = await manager.createLogWriter();
    expect(writer.logFilePath as string).to.match(/\.gz$/);
    writer.info('component', mongoLogId(12345), 'context', 'message', {
      foo: 'bar',
    });
    writer.end();
    await once(writer, 'log-finish');

    const log = (
      await promisify(gunzip)(await fs.readFile(writer.logFilePath as string))
    )
      .toString()
      .split('\n')
      .filter(Boolean)
      .map((line: string) => JSON.parse(line));
    expect(log).to.have.lengthOf(1);
    expect(log[0].t.$date).to.be.a('string');
  });

  it('optionally can read truncated gzip’ed log files', async function () {
    const manager = new MongoLogManager({
      directory,
      retentionDays,
      onwarn,
      onerror,
      gzip: true,
    });

    const writer = await manager.createLogWriter();
    expect(writer.logFilePath as string).to.match(/\.gz$/);
    writer.info('component', mongoLogId(12345), 'context', 'message', {
      foo: 'bar',
    });
    await writer.flush();

    const log = (
      await promisify(gunzip)(await fs.readFile(writer.logFilePath as string), {
        finishFlush: zlibConstants.Z_SYNC_FLUSH,
      })
    )
      .toString()
      .split('\n')
      .filter(Boolean)
      .map((line: string) => JSON.parse(line));
    expect(log).to.have.lengthOf(1);
    expect(log[0].t.$date).to.be.a('string');

    // Still clean up here because Windows doesn’t like open files:
    writer.end();
    await once(writer, 'finish');
  });
});
