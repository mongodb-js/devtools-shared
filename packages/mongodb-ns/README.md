# mongodb-ns

Handle dem namespaces like the kernel do.

```
var ns = require('mongodb-ns');

var bacon = ns('canadian-things.songs-aboot-bacon');
console.log(bacon.toString() + '\n', bacon);
```

will output

```
canadian-things.songs-aboot-bacon
 NS {
  ns: 'canadian-things.songs-aboot-bacon',
  dotIndex: 15,
  database: 'canadian-things',
  collection: 'songs-aboot-bacon',
  system: false,
  oplog: false,
  command: false,
  special: false,
  specialish: false,
  normal: true,
  validDatabaseName: true,
  validCollectionName: true,
  databaseHash: 23620443216 }
```
