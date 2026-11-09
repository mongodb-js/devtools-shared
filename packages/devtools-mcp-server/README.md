# @mongodb-js/devtools-mcp-server

A [Model Context Protocol](https://modelcontextprotocol.io) server for MongoDB
DevTools, and an OpenCode plugin that installs it together with the official
MongoDB MCP server.

It wraps [`@mongodb-js/mongodb-runner`](../mongodb-runner) so an agent can start
real MongoDB deployments, seed and save fixtures, inspect logs, and tear
everything down — while the database operations themselves (find, insert,
aggregate, indexes, schema, ...) come from the official
[`mongodb-mcp-server`](https://www.mongodb.com/docs/mcp-server/).

## Tools

### Cluster tools

| Tool                           | Description                                                                      |
| ------------------------------ | -------------------------------------------------------------------------------- |
| `mongodb_start_cluster`        | Starts a deployment and returns its id and connection string.                    |
| `mongodb_list_clusters`        | Lists the clusters tracked in the runner registry (no connection is made).       |
| `mongodb_get_cluster`          | Probes a cluster: reachable or not, servers, version, variant and log directory. |
| `mongodb_cluster_logs`         | Returns the last lines of every mongod/mongos log of a cluster.                  |
| `mongodb_prune_stale_clusters` | Removes registry entries for clusters that are no longer reachable.              |
| `mongodb_stop_cluster`         | Stops one cluster by id, or every cluster with `all: true`.                      |

Cluster metadata is stored in `~/.mongodb/runner2` (override with
`MONGODB_RUNNER_RUNNER_DIR`), the same directory the `mongodb-runner` CLI uses,
so clusters started by either one show up in both. Logs are written to
`<runner dir>/logs` unless `logDir` is passed to `mongodb_start_cluster`.

`mongodb_start_cluster` covers every topology `mongodb-runner` supports:

- `standalone`: a single mongod.
- `replset`: secondaries/arbiters, or explicit `rsMembers` for custom
  priorities, tags (e.g. Atlas-style `{ "nodeType": "ANALYTICS" }` analytics
  nodes) and per-member arguments.
- `sharded`: shard count or per-shard replica set configuration, plus one or
  more mongos routers via `mongosArgs`.
- DSC: pass `slsDir` to back the cluster with the SLS disaggregated-storage
  layer. Requires Docker with compose v2 and a DSC-capable mongod.

Starting a cluster is a blocking call (it returns the id and connection string),
but it emits `notifications/progress` updates when the client sends a progress
token with the request.

### Database tools (official MongoDB MCP server)

Database operations are not reimplemented here. The plugin registers the
official `mongodb-mcp-server` as a second MCP server (`mongodb`), which provides
`find`, `aggregate`, `count`, `insert-many`, `update-many`, `delete-many`,
collection and index management, schema inspection, `export`, `mongodb-logs`
and more.

Connect it to a cluster started above, using the connection string the start
tool returned:

```
mongodb_connect { "connectionString": "mongodb://127.0.0.1:27017/", "connectionName": "fixtures" }
→ { "connectionId": "fixtures-<suffix>" }
```

Every database tool then takes that `connectionId`, so several clusters can be
connected at once. The connection string is visible in the conversation — fine
for the local, credential-free clusters this server starts, but avoid it for
clusters created with `users` or `oidc`.

### DevTools-only tools

These have no equivalent in the official server:

| Tool                   | Description                                                           |
| ---------------------- | --------------------------------------------------------------------- |
| `mongodb_run_command`  | Runs any database command (fail points, `collMod`, `distinct`, ...).  |
| `mongodb_save_fixture` | Writes a collection's documents to an Extended JSON file.             |
| `mongodb_load_fixture` | Inserts documents from such a file, optionally dropping first.        |
| `mongodb_fail_point`   | Configures a server fail point. Needs test commands enabled at start. |

Fixture files are canonical Extended JSON and default to
`.devtools-mcp/fixtures/<database>.<collection>.ejson` in the working
directory, so they can be committed with the repository.

### Workflow

1. `mongodb_start_cluster` with `{ "topology": "standalone" }` → cluster id and
   connection string.
2. `mongodb_connect` with that connection string → `connectionId`.
3. Seed and inspect with the official database tools (`insert-many`, `find`,
   `aggregate`, ...).
4. `mongodb_save_fixture` to keep the data, `mongodb_load_fixture` to restore
   it, `mongodb_fail_point` to simulate failures.
5. `mongodb_stop_cluster`. If a start crashed, `mongodb_get_cluster` reports it
   as not reachable and `mongodb_prune_stale_clusters` removes the entry.

## Usage

```sh
npx @mongodb-js/devtools-mcp-server
```

### OpenCode

The package's default export is an OpenCode plugin. Install it:

```sh
opencode plugin add 'github:mongodb-js/devtools-shared#main::path:packages/devtools-mcp-server'
# or, once published:
opencode plugin add @mongodb-js/devtools-mcp-server
```

The plugin entry is plain ESM (`opencode-plugin.mjs`), so installing from git
needs no build step. The MCP server binary (`dist/bin.js`) is produced at publish
time; when the package is installed from a source checkout without `dist`, the
plugin falls back to `npx -y @mongodb-js/devtools-mcp-server`. Use the
`serverCommand` option to point at a local build instead.

The plugin registers servers through OpenCode's transforms (nothing is written to
your configuration) plus the two bundled skills:

| MCP server                   | Registered when                                                     |
| ---------------------------- | ------------------------------------------------------------------- |
| `devtools`                   | always — bundled `dist/bin.js`, or `npx` when installed from source |
| `mongodb` (official)         | `mongodbServerCommand` is not `false`                               |
| `chrome-devtools` (official) | `chromeDevtoolsServerCommand` is not `false`                        |
| `devprod-mcp`                | `devprodMcpUrl` or `DEVPROD_MCP_URL` is set                         |
| `glean-enterprise`           | `gleanEnterpriseUrl` or `GLEAN_ENTERPRISE_URL` is set               |

Check the result with `opencode mcp list`. Remote servers need a sign-in the
first time: open `/mcps` in OpenCode and complete the OAuth flow.

The plugin never replaces an MCP server you configured by hand: each entry above
is added only when that server name is not already present in your config.

#### Plugin options

| Option                        | Default                                                              | Description                                                                                                       |
| ----------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `serverCommand`               | bundled `dist/bin.js`, else `npx -y @mongodb-js/devtools-mcp-server` | Command that starts the DevTools server.                                                                          |
| `mongodbServerCommand`        | `["npx", "-y", "mongodb-mcp-server@3"]`                              | Command for the official MongoDB server, or `false` to skip it.                                                   |
| `chromeDevtoolsServerCommand` | `["npx", "-y", "chrome-devtools-mcp@1"]`                             | Command for the official Chrome DevTools server, or `false` to skip it. Add `--browser-url` to attach to Compass. |
| `devprodMcpUrl`               | none                                                                 | Internal devprod-mcp endpoint. No default; falls back to `DEVPROD_MCP_URL`.                                       |
| `gleanEnterpriseUrl`          | none                                                                 | Internal Glean endpoint. No default; falls back to `GLEAN_ENTERPRISE_URL`.                                        |

#### Configuring the plugin

`opencode plugin add` records the package as a **string** in the global config.
To pass options, replace that entry with the object form in
`~/.config/opencode/opencode.json(c)` (or in a project `opencode.json(c)` or
`.opencode/opencode.json(c)` if you only want it for one repository):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "@mongodb-js/devtools-mcp-server",
      "options": {
        "serverCommand": ["node", "/path/to/dist/bin.js"],
        "mongodbServerCommand": ["npx", "-y", "mongodb-mcp-server@3.3.0"],
        "chromeDevtoolsServerCommand": [
          "npx",
          "-y",
          "chrome-devtools-mcp@1",
          "--browser-url",
          "http://127.0.0.1:9222",
        ],
        "devprodMcpUrl": "https://<internal-devprod-mcp-endpoint>/mcp",
        "gleanEnterpriseUrl": "https://<internal-glean-endpoint>/mcp",
      },
    },
  ],
}
```

Keep only one entry per plugin: two entries share the same plugin ID (`devtools`)
and do not merge.

#### Internal endpoints without editing config

`devprodMcpUrl` and `gleanEnterpriseUrl` have **no defaults** because the
endpoints are internal. Supply them in one of these ways:

- **Config** — the object entry above. Durable, and applies to every project on
  the machine.
- **Environment** — export `DEVPROD_MCP_URL` and/or `GLEAN_ENTERPRISE_URL` in
  your shell profile. Options win over environment variables. The environment is
  read when the plugin loads, so run `opencode service restart` after changing
  it; config changes reload on save (or with `/reload`).
- **Separate entries** — leave the plugin options out and add the servers
  directly, e.g. `opencode mcp add devprod-mcp --global --url <endpoint>`. The
  plugin does not register them when neither the option nor the environment
  variable is set, so there is no duplicate.

#### Disabling or pinning servers

Set a command to `false` to skip that server, or replace the command to pin a
version:

```jsonc
{
  "plugins": [
    {
      "package": "@mongodb-js/devtools-mcp-server",
      "options": {
        "mongodbServerCommand": false,
        "chromeDevtoolsServerCommand": false,
      },
    },
  ],
}
```

#### Bundled skills

The plugin also registers `devtools-mcp-workflows` (cluster → connect → fixtures
→ fail points) and `start-compass-with-devtools` (attaching the chrome-devtools
MCP server to a Compass build).

### Programmatic use

The library API (cluster and database helpers, `createServer`) is exported from
the `server` subpath, since the package root is the OpenCode plugin:

```ts
import { createServer } from '@mongodb-js/devtools-mcp-server/server';
```

## Development

```sh
npm run compile
npm test
```

## License

Apache 2.0
