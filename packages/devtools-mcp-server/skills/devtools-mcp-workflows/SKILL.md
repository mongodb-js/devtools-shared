---
name: DevTools MCP workflows
description: Use the devtools and mongodb MCP servers together to start local MongoDB clusters, connect to them, seed and save fixtures, simulate failures, read server logs and tear everything down. Use when a task needs a real MongoDB deployment, reproducible data, or a failure scenario that unit tests cannot cover.
---

# DevTools MCP workflows

The `devtools` server owns the cluster lifecycle; the official `mongodb` server
owns database operations. The bridge is a connection string plus a
`connectionId`.

## Prerequisites

- Both servers are connected: `opencode mcp list` shows `devtools` and
  `mongodb`. Installing `@mongodb-js/devtools-mcp-server` as an OpenCode plugin
  registers both (and `chrome-devtools` for browser work).
- Node.js >= 24.22.2.

## 1. Start a cluster

```
mongodb_start_cluster { "topology": "standalone" }
```

Useful options:

- `replset`: `secondaries`, `arbiters`, or `rsMembers` for priorities and tags
  (analytics nodes are `{ "tags": { "nodeType": "ANALYTICS" }, "priority": 0 }`).
- `sharded`: `shards` (count or per-shard config) and `mongosArgs`.
- `slsDir` for DSC clusters (needs Docker and a DSC-capable build).
- `version`, `downloadUrl`, `binDir`, `docker` to choose the server build.
- `args: ["--setParameter", "enableTestCommands=true"]` when fail points are
  needed.
- `version` is optional; the first start downloads binaries and can take
  minutes. Progress notifications are sent if the client asked for them.

The result contains the cluster `id` and its `connectionString`. Logs go to
`<runner dir>/logs` by default.

## 2. Connect the database server

```
mongodb_connect { "connectionString": "<from the start result>", "connectionName": "fixtures" }
→ { "connectionId": "..." }
```

Reuse that `connectionId` for every database tool. Connect several clusters with
different `connectionName`s to switch between them.

The connection string is visible in the conversation. This is intended for the
local, credential-free clusters started here — avoid it for clusters started
with `users` or `oidc`.

## 3. Work with data

The official server provides `find`, `aggregate`, `count`, `insert-many`,
`update-many`, `delete-many`, `create-index`/`drop-index`,
`drop-collection`/`drop-database`, `list-collections`, `collection-indexes`,
`collection-schema`, `export` and more. All of them take `connectionId`.

- `find` defaults to 10 documents and a 1 MB response limit; pass `limit` and a
  `responseBytesLimit` when checking larger result sets.
- `export` writes canonical or relaxed EJSON to the official server's export
  directory.

## 4. Fixtures (devtools server)

Fixtures are cluster-id addressed and default to
`.devtools-mcp/fixtures/<database>.<collection>.ejson` in the working directory,
so they can be committed.

```
mongodb_save_fixture { "clusterId": "...", "database": "app", "collection": "users", "filter": { "active": true } }
mongodb_load_fixture { "clusterId": "...", "database": "app", "collection": "users", "drop": true }
```

Files are canonical Extended JSON: `{ "$oid": ... }`, `{ "$date": ... }` and
`{ "$numberLong": ... }` survive the round trip.

## 5. Simulate failures

Start the cluster with test commands enabled, then:

```
mongodb_fail_point { "clusterId": "...", "name": "failCommand", "mode": "alwaysOn",
  "data": { "failCommands": ["insert"], "errorCode": 11600 } }
```

Turn it off with `"mode": "off"`. Without `enableTestCommands` the server answers
`no such command: 'configureFailPoint'`.

## 6. Escape hatches (devtools server)

`mongodb_run_command` takes a raw command when no dedicated tool exists:
`distinct`, `collMod`, `configureFailPoint`, `validate`, and so on.

```
mongodb_run_command { "clusterId": "...", "database": "app", "command": { "distinct": "users", "key": "name" } }
```

## 7. Inspect and tear down

- `mongodb_get_cluster` — reachable or not, servers, version, variant, log dir.
- `mongodb_cluster_logs` — last lines of every mongod/mongos log, useful when a
  start or a test failed.
- `mongodb_stop_cluster` — stop one cluster by id, or all of them.
- `mongodb_prune_stale_clusters` — drop registry entries for clusters that are
  no longer reachable (a crashed start leaves one behind).

## Pitfalls

- Database tools fail with an unknown connection if `mongodb_connect` was not
  called or the cluster was stopped.
- `mongodb_stop_cluster` deletes the registry entry; `mongodb_list_clusters`
  afterwards no longer shows it.
- One MCP server may be configured with a read-only mode; check before assuming
  writes will work.
