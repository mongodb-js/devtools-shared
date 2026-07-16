# Launching a DSC cluster

mongodb-runner can launch MongoDB clusters that use DSC, backed by an SLS
storage layer. In this mode, the runner:

1. Starts a docker compose project providing the storage backend
   (log servers, page servers, cell metadata services, schedulers, a localstack
   S3/SQS emulation, etc.),
2. waits for the storage layer to become ready,
3. pre-allocates the ports of all `mongod` nodes (so the storage configuration
   can reference the replica set members before they start),
4. runs a per-shard setup step against the storage layer,
5. starts every `mongod` with
   `--setParameter disaggregatedStorageConfig=...` and
   `--setParameter disaggregatedStorageEnabled=true`.

The compose project is started **once per cluster** and shared by all shards;
each shard only runs its own setup step (e.g. starting an SLS log) against the
shared storage layer. When the cluster is stopped, the compose project is torn
down with it (`docker compose down --volumes`), including when cluster startup
fails partway through.

For replica sets with DSC, the default node count is **2**
(1 primary + 1 secondary) instead of the usual 3. This applies to the shard
replica sets of a sharded cluster as well. Set `secondaries` explicitly to
override.

## Prerequisites

- Docker with `docker compose` v2.
- Access to the SLS container images. The default repository is a private ECR
  registry, so log in first:

  ```bash
  aws ecr get-login-password --region us-east-1 | \
    docker login --username AWS --password-stdin 664315256653.dkr.ecr.us-east-1.amazonaws.com
  ```

- A `mongod` build that understands the `disaggregatedStorageConfig`
  server parameter. Stock community/enterprise release binaries do **not** —
  you need a build of the server with the atlas module. Provide it either as:
  - `binDir`: a local directory containing the binaries, or
  - `downloadUrl`: a URL to a tarball of such a build (cached by URL, standard
    release-tarball layout with a top-level directory containing `bin/`).
- The SLS multi-cell compose file — mongodb-runner does not ship one; point
  it at the file you want to use, typically
  `buildscripts/modules/atlas/sls-multicell-docker-compose.yml` in a mongodb
  server checkout. Files it references (`slsbackup.proto`,
  `flags-state.json`) are resolved relative to it, and the services/ports are
  parsed from it, so any version of the file works as-is.
- The SLS image tag to use, typically the `pinned_sls_commit` from
  `buildscripts/modules/atlas/manifest.json` in the mongodb server repository.

## Quick start

Given the compose file and image tag, everything else (compose environment
variables, readiness polling, per-shard log creation, and the
`disaggregatedStorageConfig` server parameter) is generated automatically.
Full sequence, assuming a mongodb server checkout at `$MONGO_REPO`:

```bash
# 1. Log in to the SLS image registry
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 664315256653.dkr.ecr.us-east-1.amazonaws.com

# 2. Look up the pinned SLS image tag
SLS_IMAGE_TAG=$(python3 -c "import json; print(json.load(open('$MONGO_REPO/buildscripts/modules/atlas/manifest.json'))['pinned_sls_commit'])")

# 3. Start a 2-node replica set backed by SLS
mongodb-runner start -t replset \
  --slsCompose=$MONGO_REPO/buildscripts/modules/atlas/sls-multicell-docker-compose.yml \
  --slsImageTag=$SLS_IMAGE_TAG \
  --binDir=/path/to/dsc-mongod/bin \
  --debug
# or, instead of --binDir:
#   --downloadUrl=https://.../dsc-mongod.tgz
```

This prints the connection string once the cluster is up. The first run pulls
all SLS images, which can take several minutes (`--debug` shows the
progress). `mongodb-runner stop --id=...` (printed by `start`) tears down the
mongod processes and the compose project together.

The same works for `-t standalone` and `-t sharded`. A DSC-capable
`mongod` is required (see Prerequisites) — with a stock binary, startup fails
with `Unknown --setParameter 'disaggregatedStorageConfig'`.

[`examples/sls-replset.js`](../examples/sls-replset.js) is the equivalent
using the programmatic API:

```bash
cd packages/mongodb-runner && npm run compile
SLS_COMPOSE_FILE=$MONGO_REPO/buildscripts/modules/atlas/sls-multicell-docker-compose.yml \
SLS_IMAGE_TAG=$SLS_IMAGE_TAG \
MONGOD_BIN_DIR=/path/to/dsc-mongod/bin \
  node examples/sls-replset.js
```

## Programmatic use

The `disaggregatedStorage` option is accepted for every topology
(standalone, replset, sharded). For an SLS project, one call creates
fully-populated options:

```typescript
import {
  MongoCluster,
  createSLSDisaggregatedStorageOptions,
} from '@mongodb-js/mongodb-runner';

const disaggregatedStorage = await createSLSDisaggregatedStorageOptions({
  composeFile: '/path/to/sls-multicell-docker-compose.yml',
  imageTag: 'abc123', // pinned_sls_commit
  // optional: projectName, firstLogId, readyTimeoutSecs, imageRepo,
  //           testDataId, hostInternalIP
});

const cluster = await MongoCluster.start({
  topology: 'sharded',
  shards: 2,
  binDir: '/path/to/dsc-mongod/bin', // or downloadUrl: '...'
  tmpDir: os.tmpdir(),
  disaggregatedStorage,
});

console.log(cluster.connectionString);
// disaggregatedStorage.sls exposes the allocated ports and service URIs.
await cluster.close(); // also tears down the compose project
```

### Custom storage backends

For a different storage backend — or to customize individual steps — provide
the `disaggregatedStorage` fields yourself. This is what
`createSLSDisaggregatedStorageOptions()` assembles under the hood:

```typescript
import {
  MongoCluster,
  createSLSMultiCellEnvironment,
  createSLSDisaggregatedStorageConfig,
} from '@mongodb-js/mongodb-runner';

// Parses the services out of the given compose file, allocates free host
// ports for them, and builds the env vars the file expects (image repo/tag,
// per-service ports, ...).
const sls = await createSLSMultiCellEnvironment({
  composeFile: '/path/to/sls-multicell-docker-compose.yml',
  imageTag: 'abc123', // pinned_sls_commit
});

const cluster = await MongoCluster.start({
  topology: 'sharded',
  shards: 2,
  downloadUrl: 'https://.../dsc-mongod.tgz', // or binDir: '...'
  tmpDir: os.tmpdir(),
  disaggregatedStorage: {
    // Any compose project providing the storage backend.
    composeFile: sls.composeFile,

    // Environment variables for compose-file interpolation. Set
    // COMPOSE_PROJECT_NAME for a predictable project/container naming scheme.
    env: { ...sls.env, COMPOSE_PROJECT_NAME: 'my-sls-project' },

    // Called once after `docker compose up`. Poll until the storage layer
    // actually serves traffic; with the SLS compose file, waiting for
    // the /ready file in the testdriver container is the canonical check.
    waitForReady: async () => {
      /* e.g. docker exec my-sls-project-testdriver-1 test -f /ready */
    },

    // Called once per shard before that shard's mongod processes start.
    // For sharded clusters, index 0 with isConfigServer: true is the config
    // server replica set; for standalone/replset it is called once with
    // { index: 0, isConfigServer: false }. The descriptor also carries the
    // replica set name and the members with their pre-allocated ports.
    setupShard: async ({ index, isConfigServer }) => {
      /* e.g. StartLog via grpcurl in the testdriver container */
    },

    // Value for `--setParameter disaggregatedStorageConfig=...`, injected
    // into every mongod (config server included) together with
    // `disaggregatedStorageEnabled=true`. With the SLS helper, this is
    // built automatically from the shard descriptor (replica set name and
    // pre-allocated member host:ports) and the SLS environment; the logId
    // must match the log started in setupShard.
    config: (shard) =>
      createSLSDisaggregatedStorageConfig(sls, shard, {
        logId: 1 + shard.index,
      }),
  },
});

console.log(cluster.connectionString);
// ...
await cluster.close(); // also tears down the compose project
```

### The SLS environment helper

`createSLSMultiCellEnvironment(options)` mirrors the `SLSMultiCellFixture`
from the server codebase and returns:

| Field         | Description                                                                                              |
| ------------- | -------------------------------------------------------------------------------------------------------- |
| `composeFile` | Path to the compose file in use                                                                          |
| `env`         | All environment variables the compose file expects (`SLS_IMAGE_REPO`, `SLS_IMAGE_TAG`, `*_PORT` vars, …) |
| `ports`       | The allocated host port per service, e.g. `ports['crs-cell1-0']`                                         |
| `services`    | Host `addr`/`uri` per service, e.g. `services['cms-cell1-0'].uri`                                        |

Required options: `composeFile`, `imageTag`. Optional: `imageRepo`,
`thirdPartyImageRepo`, `testDataId` (container label for test attribution),
`hostInternalIP`. The service list is parsed from the compose file's
`ports:` mappings (`parseSLSComposeServices`), so it adapts to whatever
version of the file is provided.

Related exports: `createSLSDisaggregatedStorageConfig` (builds the mongod
server parameter for one shard; options: `logId`, `cellMetadataService`,
`zoneName`, `encryptionKeyFilePath`), `parseSLSComposeServices`,
`SLS_HOSTNAME`, `SLS_CELL1`/`SLS_CELL2`/`SLS_CELL3`, and
`DockerComposeProject` for managing compose projects directly.

## CLI use

For an SLS project, `--slsCompose` + `--slsImageTag` handle everything (see
Quick start):

```bash
mongodb-runner start -t replset \
  --slsCompose=/path/to/sls-multicell-docker-compose.yml \
  --slsImageTag=<tag> --binDir=...
```

For a **custom** storage backend with its own compose file, use the low-level
flags — a static compose project and an explicit config value:

```bash
mongodb-runner start -t replset \
  --downloadUrl https://.../dsc-mongod.tgz \
  --disaggregatedStorageCompose ./path/to/docker-compose.yml \
  --disaggregatedStorageConfig '{"...": "..."}'
```

`--disaggregatedStorageConfig` takes the JSON (or plain string) value for the
`disaggregatedStorageConfig` server parameter. Custom compose environment
variables, readiness polling, and per-shard setup steps require the
programmatic API.

`mongodb-runner stop --id=...` restores the cluster metadata and tears down
the compose project along with the mongod processes, even from a different
process than the one that started it.

## Troubleshooting

- **`Unknown --setParameter 'disaggregatedStorageConfig'`** — the `mongod`
  being launched is a stock build. Point `binDir`/`downloadUrl` at a
  DSC-capable build. Also note that binaries must match the host platform;
  a Linux build from a VM checkout cannot run directly on macOS.
- **`StartLog` fails with `log segment already exists`** — the requested log
  ID is already in use. Log ID `9999` is reserved by the cell metadata
  services in the SLS compose file; also, the storage layer's state
  persists while the compose project is running, so re-running setup with the
  same log ID conflicts. Either tolerate the error and reuse the log (see the
  example script), or reset the storage layer.
- **Resetting the storage layer** — with a fixed `COMPOSE_PROJECT_NAME`:

  ```bash
  docker compose -p <project-name> down --volumes
  ```

- **Seeing what's happening** — run with `DEBUG='mongodb-runner*,mongodb-downloader*'`
  (or `--verbose` on the CLI) to get compose output, tarball download
  progress, and per-server mongod log entries.
