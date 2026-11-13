import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';
import { expect } from 'chai';
import assert from 'assert';
import type { MongoClusterSerializedProperties } from '@mongodb-js/mongodb-runner';
import { readClusterLogs, tailFile } from './logs';

function cluster({
  logDir,
  servers,
}: {
  logDir?: string;
  servers: { uuid: string; port: number; isMongos?: boolean }[];
}): MongoClusterSerializedProperties {
  return {
    topology: servers.some((server) => server.isMongos)
      ? 'sharded'
      : 'standalone',
    servers: servers.map((server) => ({
      _id: server.uuid,
      host: '127.0.0.1',
      port: server.port,
      isMongos: server.isMongos,
      startTime: '2026-01-02T00:00:00.000Z',
      hasInsertedMetadataCollEntry: true,
    })),
    shards: [],
    defaultConnectionOptions: {},
    users: [],
    ...(logDir
      ? { options: { topology: 'standalone', tmpDir: '/tmp', logDir } }
      : {}),
  } as MongoClusterSerializedProperties;
}

describe('logs', function () {
  let logDir: string;

  beforeEach(async function () {
    logDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-logs-'));
  });

  afterEach(async function () {
    await fs.rm(logDir, { recursive: true, force: true });
  });

  describe('tailFile', function () {
    it('returns the last lines of a file', async function () {
      const filePath = path.join(logDir, 'mongod.log');
      await fs.writeFile(filePath, 'one\ntwo\nthree\n');

      expect(await tailFile(filePath, 2)).to.deep.equal(['two', 'three']);
    });

    it('handles files without a trailing newline', async function () {
      const filePath = path.join(logDir, 'mongod.log');
      await fs.writeFile(filePath, 'one\ntwo');

      expect(await tailFile(filePath, 5)).to.deep.equal(['one', 'two']);
    });
  });

  describe('readClusterLogs', function () {
    it('rejects clusters started without a log directory', async function () {
      await assert.rejects(
        readClusterLogs(cluster({ servers: [{ uuid: 'a', port: 27017 }] }), {
          tailLines: 10,
        }),
        /started without a log directory/,
      );
    });

    it('finds the log file by server uuid and binary', async function () {
      const logFile = path.join(logDir, 'mongod-a-2026-01-02T000000000Z.log');
      await fs.writeFile(logFile, 'line 1\nline 2\n');

      const result = await readClusterLogs(
        cluster({ logDir, servers: [{ uuid: 'a', port: 27017 }] }),
        { tailLines: 1 },
      );

      expect(result).to.deep.equal([
        {
          host: '127.0.0.1',
          port: 27017,
          type: 'mongod',
          path: logFile,
          lines: ['line 2'],
        },
      ]);
    });

    it('reports servers without a log file instead of failing', async function () {
      const result = await readClusterLogs(
        cluster({
          logDir,
          servers: [{ uuid: 'missing', port: 27017, isMongos: true }],
        }),
        { tailLines: 10 },
      );

      expect(result).to.deep.equal([
        {
          host: '127.0.0.1',
          port: 27017,
          type: 'mongos',
          path: null,
          lines: [],
        },
      ]);
    });
  });
});
