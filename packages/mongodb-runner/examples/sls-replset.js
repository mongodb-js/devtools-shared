#!/usr/bin/env node
/* eslint-disable no-console */
'use strict';

// Starts a 2-node replica set backed by the SLS multi-cell disaggregated
// storage compose project.
//
// Usage:
//   SLS_IMAGE_TAG=<pinned_sls_commit> MONGOD_BIN_DIR=/path/to/mongod/dir \
//     node examples/sls-replset.js

// Enable mongodb-runner debug output (compose progress, server startup, ...)
// unless the user already configured DEBUG themselves.
process.env.DEBUG = process.env.DEBUG || 'mongodb-runner,mongodb-downloader';

const { execFileSync } = require('child_process');
const os = require('os');
const {
  MongoCluster,
  createSLSMultiCellEnvironment,
} = require('../dist/index.js');

const PROJECT_NAME = 'mongodb-runner-sls';

function waitForTestdriverReady(timeoutSecs = 300) {
  const start = Date.now();
  const deadline = start + timeoutSecs * 1000;
  const container = `${PROJECT_NAME}-testdriver-1`;
  console.log(`waiting for SLS storage layer (container: ${container})...`);
  while (Date.now() < deadline) {
    try {
      execFileSync('docker', ['exec', container, 'test', '-f', '/ready'], {
        stdio: 'ignore',
      });
      console.log('SLS storage layer is ready');
      return;
    } catch {
      const elapsed = Math.round((Date.now() - start) / 1000);
      console.log(`still waiting for SLS storage layer... (${elapsed}s)`);
    }
    execFileSync('sleep', ['2']);
  }
  throw new Error(`SLS storage layer not ready after ${timeoutSecs}s`);
}

function startLog(logId) {
  const container = `${PROJECT_NAME}-testdriver-1`;
  const grpcurl = (service, method, payload) =>
    JSON.parse(
      execFileSync(
        'docker',
        [
          'exec',
          container,
          '/grpcurl',
          '-plaintext',
          '-d',
          JSON.stringify(payload),
          service,
          method,
        ],
        { encoding: 'utf8' },
      ) || '{}',
    );

  const cells = [
    { cell: 'cell1', zone: 'zone1' },
    { cell: 'cell2', zone: 'zone2' },
    { cell: 'cell3', zone: 'zone3' },
  ];
  const res = grpcurl(
    'crs-cell1-0:27996',
    'schedulerservice.v1.SchedulerService/GetLogServers',
    { cells },
  );
  const serverIds = res.server_ids || res.serverIds || [];
  if (!serverIds.length) throw new Error('GetLogServers returned no servers');

  try {
    return grpcurl(
      'crs-cell1-0:27996',
      'schedulerservice.v1.ControlPlaneService/StartLog',
      { log_id: logId, server_ids: serverIds, ancestry: { ancestors: [] } },
    );
  } catch (err) {
    // The storage layer persists across runs (and the compose project is
    // reused when the project name matches), so the log may already exist.
    const output = `${err.stderr || ''}${err.stdout || ''}`;
    if (output.includes('already exists')) {
      console.log(`log ${logId} already exists, reusing it`);
      return {};
    }
    throw err;
  }
}

async function main() {
  if (!process.env.MONGOD_BIN_DIR && !process.env.MONGOD_DOWNLOAD_URL) {
    throw new Error(
      'Set MONGOD_BIN_DIR to a directory containing a mongod build that ' +
        'supports the disaggregatedStorageConfig setParameter, or ' +
        'MONGOD_DOWNLOAD_URL to a tarball URL of such a build. ' +
        '(Otherwise mongodb-runner downloads a stock community binary, ' +
        'which will fail with "Unknown --setParameter".)',
    );
  }

  const sls = await createSLSMultiCellEnvironment({
    imageTag: process.env.SLS_IMAGE_TAG,
  });

  console.log('SLS service ports:', sls.ports);
  console.log(
    'starting docker compose project (this pulls all SLS images on first ' +
      'run, which can take several minutes)...',
  );

  const cluster = await MongoCluster.start({
    topology: 'replset',
    secondaries: 1, // 2 nodes total (this is also the disagg default)
    tmpDir: os.tmpdir(),
    binDir: process.env.MONGOD_BIN_DIR,
    downloadUrl: process.env.MONGOD_DOWNLOAD_URL,
    disaggregatedStorage: {
      composeFile: sls.composeFile,
      env: { ...sls.env, COMPOSE_PROJECT_NAME: PROJECT_NAME },
      waitForReady: async () => waitForTestdriverReady(),
      setupShard: async ({ index }) => {
        // Log ID 9999 is reserved by the cell metadata service (see the
        // cms_config/crs_config log_ids entries in the compose file), so
        // start counting from 1.
        const logId = 1 + index;
        console.log(`starting SLS log ${logId} for shard ${index}`);
        startLog(logId);
      },
      // TODO: fill in with the config shape your mongod expects -- see what
      // the sls_fixture-based jstests pass to mongod. The SLS service URIs
      // are available in sls.services, e.g.:
      config: {
        crsUri: sls.services['crs-cell1-0'].uri,
        cmsUri: sls.services['cms-cell1-0'].uri,
      },
    },
  });

  console.log('Replica set running at:', cluster.connectionString);
  console.log('Press Ctrl+C to shut down');

  process.on('SIGINT', () => {
    cluster.close().then(
      () => process.exit(0),
      (err) => {
        console.error(err);
        process.exit(1);
      },
    );
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
