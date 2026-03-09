import { expect } from 'chai';
import type { LogEntry } from './index';
import { ServerLogsChecker } from './index';
import { EventEmitter } from 'events';
import { MongoCluster } from 'mongodb-runner';
import path from 'path';
import { tmpdir } from 'os';
import { setTimeout as delay } from 'timers/promises';

function createLogEntry(
  severity: 'W' | 'E' | 'F' | 'I',
  id: number,
  attr?: any,
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    severity,
    id,
    attr,
    component: 'testComponent',
    context: 'testContext',
    message: `Test log entry with ID ${id}`,
  };
}

describe('ServerLogsChecker', function () {
  let logEmitter: EventEmitter;
  let checker: ServerLogsChecker;

  beforeEach(function () {
    logEmitter = new EventEmitter();
    checker = new ServerLogsChecker(logEmitter);
  });

  afterEach(function () {
    checker.close();
  });

  it('collects warnings, errors, and fatal logs', function () {
    const warningEntry = createLogEntry('W', 1001);
    const errorEntry = createLogEntry('E', 2001);
    const fatalEntry = createLogEntry('F', 3001);
    const infoEntry = createLogEntry('I', 4001); // Should be ignored

    logEmitter.emit('mongoLog', 'server', warningEntry);
    logEmitter.emit('mongoLog', 'server', errorEntry);
    logEmitter.emit('mongoLog', 'server', fatalEntry);
    logEmitter.emit('mongoLog', 'server', infoEntry);

    expect(checker.warnings).to.deep.equal([
      warningEntry,
      errorEntry,
      fatalEntry,
    ]);
  });

  it('allows specific warnings by log ID', function () {
    const warningEntry = createLogEntry('W', 1001);
    checker.allowWarning(1001);

    logEmitter.emit('mongoLog', 'server', warningEntry);

    expect(checker.warnings).to.deep.equal([]);
  });

  it('allows specific warnings by predicate function', function () {
    const warningEntry = createLogEntry('W', 1001, { message: 'Test warning' });
    checker.allowWarning((entry) => entry.attr.message === 'Test warning');

    logEmitter.emit('mongoLog', 'server', warningEntry);

    expect(checker.warnings).to.deep.equal([]);
  });

  it('does not allow warnings that do not match filters', function () {
    const warningEntry = createLogEntry('W', 1001);
    checker.allowWarning(9999); // Allow a different log ID

    logEmitter.emit('mongoLog', 'server', warningEntry);

    expect(checker.warnings).to.deep.equal([warningEntry]);
  });

  context('runner integration', function () {
    let cluster: MongoCluster;

    beforeEach(async function () {
      this.timeout(180_000); // Extra time for server binary download
      cluster = await MongoCluster.start({
        topology: 'replset',
        secondaries: 0,
        tmpDir: path.join(tmpdir(), 'mongodb-server-log-checker-test'),
        args: ['--setParameter', 'enableTestCommands=1'],
      });
      checker = new ServerLogsChecker(cluster);
    });

    afterEach(async function () {
      checker?.close();
      await cluster?.close();
    });

    it('collects warnings from the cluster', async function () {
      await cluster.withClient(async (client) => {
        // Configuring a fail point is a reliable way to generate a warning log entry
        await client.db('admin').command({
          configureFailPoint: 'failCommand',
          mode: 'alwaysOn',
          data: { errorCode: 2, failCommands: ['find'] },
        });
      });
      await delay(1000);
      expect(checker.warnings).to.have.lengthOf.greaterThan(0);
      expect(checker.warnings.find((w) => w.id === 23829)).to.exist;
      expect(() => checker.noServerWarningsCheckpoint()).to.throw(
        /Unexpected server warnings detected/,
      );
    });
  });
});
