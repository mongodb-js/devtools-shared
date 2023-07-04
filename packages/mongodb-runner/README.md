# mongodb-runner

Helper for spinning up MongoDB servers and clusters for testing.

## Example usage

> Note: Version 5 of mongodb-runner is a full re-write. Many things work
> differently in version 5 and above.

```bash
$ npx mongodb-runner start -t sharded
$ npx mongodb-runner start -t replset -- --port 27017
$ npx mongodb-runner start -t replset -- --setParameter allowDiskUseByDefault=true
$ npx mongodb-runner stop --all
$ npx mongodb-runner exec -t standalone -- sh -c 'mongosh $MONGODB_URI'
$ npx mongodb-runner exec -t standalone -- --setParameter allowDiskUseByDefault=true -- sh -c 'mongosh $MONGODB_URI'
```

## Options

```
mongodb-runner <command>

Commands:
  mongodb-runner start  Start a MongoDB instance
  mongodb-runner stop   Stop a MongoDB instance
  mongodb-runner ls     List currently running MongoDB instances
  mongodb-runner exec   Run a process with a MongoDB instance (as MONGODB_URI
                        env var)

Options:
  -t, --topology     Select a topology type
           [choices: "standalone", "replset", "sharded"] [default: "standalone"]
      --arbiters     number of arbiter nodes for each replica set       [number]
      --secondaries  number of secondaries for each replica set         [number]
      --shards       number of shards for sharded clusters              [number]
      --version      MongoDB server version to use                      [string]
      --logDir       Directory to store server log files in             [string]
      --binDir       Directory containing mongod/mongos binaries        [string]
      --tmpDir       Directory for temporary files    [string] [default: "/tmp"]
      --runnerDir    Directory for storing cluster metadata
                           [string] [default: "/home/addaleax/.mongodb/runner2"]
      --docker       Docker image name to run server instances under    [string]
      --id           ID to save the cluster metadata under              [string]
      --all          for `stop`: stop all clusters                     [boolean]
      --debug        Enable debug output                               [boolean]
      --help         Show help                                         [boolean]
```

## Programmatic use

```
import { MongoCluster } from 'mongodb-runner';

const cluster = await MongoCluster.start({
  topology: 'standalone'
});

try {
  console.log(cluster.connectionString);
} finally {
  await cluster.close();
}
```

## License

Apache 2.0
