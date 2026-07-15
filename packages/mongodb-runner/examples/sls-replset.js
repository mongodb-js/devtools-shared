#!/usr/bin/env node
/* eslint-disable no-console */
'use strict';

// Starts a 2-node replica set backed by the SLS multi-cell disaggregated
// storage compose project.
//
// Usage:
//   SLS_IMAGE_TAG=<pinned_sls_commit> MONGOD_BIN_DIR=/path/to/mongod/dir \
//     node examples/sls-replset.js
//
// This is equivalent to:
//   mongodb-runner start -t replset --sls --slsImageTag=<tag> --binDir=...

// Enable mongodb-runner debug output (compose progress, server startup, ...)
// unless the user already configured DEBUG themselves.
process.env.DEBUG = process.env.DEBUG || 'mongodb-runner,mongodb-downloader';

const os = require('os');
const {
  MongoCluster,
  createSLSDisaggregatedStorageOptions,
} = require('../dist/index.js');

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

  // Sets up everything the bundled SLS compose project needs: env vars with
  // allocated service ports, readiness polling, per-shard log creation, and
  // the mongod disaggregatedStorageConfig server parameter.
  const disaggregatedStorage = await createSLSDisaggregatedStorageOptions({
    imageTag: process.env.SLS_IMAGE_TAG,
  });

  console.log('SLS service ports:', disaggregatedStorage.sls.ports);
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
    disaggregatedStorage,
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
