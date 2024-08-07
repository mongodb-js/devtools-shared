# node-webpack-startup-snapshot-checker

Use webpack to bundle a Node.js module or package and then verify whether the result
can be included in [Node.js startup snapshots] (using the current executable).

```sh
$ npx node-webpack-startup-snapshot-checker ./index.js
```

Exits with code 0 in case of success, or a nonzero exit code otherwise.

[node.js startup snapshots]: https://nodejs.org/api/v8.html#startup-snapshot-api
