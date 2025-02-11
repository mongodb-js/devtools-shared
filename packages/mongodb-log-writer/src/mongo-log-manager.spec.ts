import { MongoLogManager, mongoLogId } from '.';
import { ObjectId } from 'bson';
import { once } from 'events';
import type { Stats, Dir } from 'fs';
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

  it('constructor throws with invalid prefixes', function () {
    expect(() => {
      new MongoLogManager({
        directory,
        retentionDays,
        prefix: '%asdabs/',
        onwarn,
        onerror,
      });
    }).to.throw();

    expect(() => {
      new MongoLogManager({
        directory,
        retentionDays,
        prefix: '$$$$',
        onwarn,
        onerror,
      });
    }).to.throw();

    expect(() => {
      new MongoLogManager({
        directory,
        retentionDays,
        prefix: 'abc_',
        onwarn,
        onerror,
      });
    }).not.to.throw();

    expect(() => {
      new MongoLogManager({
        directory,
        retentionDays,
        prefix: 'something',
        onwarn,
        onerror,
      });
    }).not.to.throw();
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

  it('can take a custom prefix for log files', async function () {
    const manager = new MongoLogManager({
      directory,
      retentionDays,
      prefix: 'custom_',
      onwarn,
      onerror,
    });

    const writer = await manager.createLogWriter();
    expect(writer.logFilePath as string).to.match(/custom_/);
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

  it('cleanup only applies to files with the prefix, if set', async function () {
    const manager = new MongoLogManager({
      directory,
      retentionDays,
      maxLogFileCount: 7,
      prefix: 'custom_',
      onwarn,
      onerror,
    });

    const paths: string[] = [];
    const offset = Math.floor(Date.now() / 1000);

    // Create 4 files: 2 with a different prefix and 2 with no prefix
    for (let i = 1; i >= 0; i--) {
      const withoutPrefix = path.join(
        directory,
        ObjectId.createFromTime(offset - i).toHexString() + '_log'
      );
      await fs.writeFile(withoutPrefix, '');
      paths.push(withoutPrefix);

      const withDifferentPrefix = path.join(
        directory,
        'different_' +
          ObjectId.createFromTime(offset - i).toHexString() +
          '_log'
      );
      await fs.writeFile(withDifferentPrefix, '');
      paths.push(withDifferentPrefix);
    }

    // Create 10 files with the prefix
    for (let i = 9; i >= 0; i--) {
      const filename = path.join(
        directory,
        `custom_${ObjectId.createFromTime(offset - i).toHexString()}_log`
      );
      await fs.writeFile(filename, '');
      paths.push(filename);
    }

    expect(await getFilesState(paths)).to.equal('11111111111111');
    await manager.cleanupOldLogFiles();

    // The first 4 files without the right prefix should still be there.
    // The next (oldest) 3 files with the prefix should be deleted.
    expect(await getFilesState(paths)).to.equal('11110001111111');
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

  describe('with a random file order', function () {
    let paths: string[] = [];
    const times = [92, 90, 1, 2, 3, 91];

    beforeEach(async function () {
      const fileNames: string[] = [];
      paths = [];
      const offset = Math.floor(Date.now() / 1000);

      for (const time of times) {
        const fileName =
          ObjectId.createFromTime(offset - time).toHexString() + '_log';
        const fullPath = path.join(directory, fileName);
        await fs.writeFile(fullPath, '0'.repeat(1024));
        fileNames.push(fileName);
        paths.push(fullPath);
      }

      sinon.replace(fs, 'opendir', async () =>
        Promise.resolve({
          [Symbol.asyncIterator]: function* () {
            for (const fileName of fileNames) {
              yield {
                name: fileName,
                isFile: () => true,
              };
            }
          },
        } as unknown as Dir)
      );
    });

    it('cleans up in the expected order with maxLogFileCount', async function () {
      const manager = new MongoLogManager({
        directory,
        retentionDays,
        maxLogFileCount: 3,
        onwarn,
        onerror,
      });

      expect(await getFilesState(paths)).to.equal('111111');

      await manager.cleanupOldLogFiles();

      expect(await getFilesState(paths)).to.equal('001110');
    });

    it('cleans up in the expected order with retentionGB', async function () {
      const manager = new MongoLogManager({
        directory,
        retentionDays,
        retentionGB: 3 / 1024 / 1024,
        onwarn,
        onerror,
      });

      expect(await getFilesState(paths)).to.equal('111111');

      await manager.cleanupOldLogFiles();

      expect(await getFilesState(paths)).to.equal('001110');
    });
  });

  describe('with multiple log retention settings', function () {
    it('with retention days, file count, and max size maintains all conditions', async function () {
      const manager = new MongoLogManager({
        directory,
        retentionDays: 1,
        maxLogFileCount: 3,
        retentionGB: 2 / 1024 / 1024,
        onwarn,
        onerror,
      });

      const paths: string[] = [];

      // Create 4 files which are all older than 1 day and 4 which are from today.
      for (let i = 0; i < 4; i++) {
        const today = Math.floor(Date.now() / 1000);
        const yesterday = today - 25 * 60 * 60;
        const todayFile = path.join(
          directory,
          ObjectId.createFromTime(today - i).toHexString() + '_log'
        );
        await fs.writeFile(todayFile, '0'.repeat(1024));

        const yesterdayFile = path.join(
          directory,
          ObjectId.createFromTime(yesterday - i).toHexString() + '_log'
        );
        await fs.writeFile(yesterdayFile, '0'.repeat(1024));

        paths.unshift(todayFile);
        paths.unshift(yesterdayFile);
      }

      expect(await getFilesState(paths)).to.equal('11111111');

      await manager.cleanupOldLogFiles();

      // All yesterdays files, 2 of today's files should be deleted.
      // (because of file count and file size)
      expect(await getFilesState(paths)).to.equal('00000101');
    });

    it('with low GB but high file count maintains both conditions', async function () {
      const manager = new MongoLogManager({
        directory,
        retentionDays,
        maxLogFileCount: 3,
        // 2 KB, so 2 files
        retentionGB: 2 / 1024 / 1024,
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
      expect(await getFilesState(paths)).to.equal('0000000011');
    });

    it('with high GB but low file count maintains both conditions', async function () {
      const manager = new MongoLogManager({
        directory,
        retentionDays,
        maxLogFileCount: 2,
        // 3 KB, so 3 files
        retentionGB: 3 / 1024 / 1024,
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
      expect(await getFilesState(paths)).to.equal('0000000011');
    });
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

  it('retries cleaning up old log files', async function () {
    const fakeDirHandle = {
      [Symbol.asyncIterator]: () => {
        throw Object.assign(new Error('File not found'), { code: 'ENOENT' });
      },
      close: sinon.stub().resolves(),
    };
    const opendirStub = sinon.stub(fs, 'opendir').resolves(fakeDirHandle as any);

    retentionDays = 0.000001; // 86.4 ms
    const manager = new MongoLogManager({
      directory,
      retentionDays,
      onwarn,
      onerror,
    });

    await manager.cleanupOldLogFiles();
    expect(opendirStub).to.have.been.calledTwice;
  });
});
