import { z } from 'zod';

/**
 * A replica set member. Exposing members explicitly is what allows Atlas-style
 * analytics nodes: `{ tags: { nodeType: 'ANALYTICS' }, priority: 0 }`.
 */
const rsMemberSchema = z.object({
  tags: z
    .record(z.string(), z.string())
    .optional()
    .describe(
      'Replica set member tags, e.g. { "nodeType": "ANALYTICS" } for an Atlas-style analytics node.',
    ),
  priority: z
    .number()
    .optional()
    .describe(
      'Election priority. One member defaults to priority 1 and all others to 0.',
    ),
  args: z
    .array(z.string())
    .optional()
    .describe('Extra mongod arguments for this member only.'),
  arbiterOnly: z.boolean().optional().describe('Start this member as arbiter.'),
});

const shardSchema = z.object({
  secondaries: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Number of secondary nodes in this shard (default 2).'),
  arbiters: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Number of arbiter nodes in this shard (default 0).'),
  rsMembers: z
    .array(rsMemberSchema)
    .min(1)
    .optional()
    .describe(
      'Explicit members for this shard; overrides secondaries/arbiters.',
    ),
  args: z
    .array(z.string())
    .optional()
    .describe('Extra mongod arguments for this shard only.'),
  version: z
    .string()
    .optional()
    .describe('MongoDB server version for this shard only.'),
  binDir: z
    .string()
    .optional()
    .describe('Binary directory for this shard only.'),
  docker: z.string().optional().describe('Docker image for this shard only.'),
});

const userSchema = z.object({
  username: z.string(),
  password: z.string(),
  roles: z
    .array(
      z.union([
        z.string(),
        z.object({ role: z.string(), db: z.string().optional() }),
      ]),
    )
    .describe(
      'Roles to grant, e.g. ["root"] or [{ "role": "readWrite", "db": "test" }].',
    ),
  customData: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Additional user document fields.'),
});

export const startClusterShape = {
  topology: z
    .enum(['standalone', 'replset', 'sharded'])
    .describe(
      'standalone: a single mongod. replset: a replica set. sharded: a config server replica set, shard replica sets and a mongos.',
    ),
  id: z
    .string()
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional()
    .describe(
      'Cluster id to store metadata under. Generated when omitted. Ids are shared with the mongodb-runner CLI.',
    ),
  version: z
    .string()
    .optional()
    .describe(
      "MongoDB server version to download, e.g. '8.2', '7.0.14', '8.x-enterprise' or 'latest-alpha'. Defaults to the downloader's current stable version.",
    ),
  downloadUrl: z
    .string()
    .optional()
    .describe(
      'Direct URL to a MongoDB tarball. Takes precedence over version and is required for builds that are not published to download.mongodb.org.',
    ),
  binDir: z
    .string()
    .optional()
    .describe(
      'Directory containing mongod/mongos binaries. Skips downloading.',
    ),
  downloadDir: z
    .string()
    .optional()
    .describe('Directory where server binaries are downloaded and cached.'),
  tmpDir: z
    .string()
    .optional()
    .describe(
      'Directory for temporary files such as dbPath. Defaults to the OS temp directory.',
    ),
  logDir: z
    .string()
    .optional()
    .describe(
      'Directory to write server log files to. No logs are kept when omitted.',
    ),
  docker: z
    .string()
    .optional()
    .describe(
      'Docker image to run the server instances under instead of local binaries.',
    ),
  args: z
    .array(z.string())
    .optional()
    .describe(
      'Extra mongod arguments, e.g. ["--setParameter", "enableTestCommands=1"]. Ports are allocated automatically unless --port is passed; for sharded clusters these apply to the shard nodes only.',
    ),
  host: z
    .string()
    .optional()
    .describe(
      'Host the servers bind to and that appears in the connection string. Defaults to 127.0.0.1.',
    ),
  users: z
    .array(userSchema)
    .min(1)
    .optional()
    .describe(
      'User accounts to create after startup. This enables authentication.',
    ),
  oidc: z
    .string()
    .optional()
    .describe(
      'Start an OIDC mock provider with these arguments and enable MONGODB-OIDC authentication, e.g. \'--payload={"groups":["x"]}\' --expiry=60. Enterprise server versions only; then connect with authMechanism=MONGODB-OIDC.',
    ),
  tlsAddClientKey: z
    .boolean()
    .optional()
    .describe(
      'Automatically add a TLS client certificate key file to each node when TLS is configured. Disable if you manage certificates yourself.',
    ),
  requireApiVersion: z
    .number()
    .int()
    .optional()
    .describe(
      'Require clients to send this API version. Not supported for replica sets.',
    ),
  secondaries: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe(
      'Number of secondary nodes per replica set (default 2, or 1 for DSC).',
    ),
  arbiters: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Number of arbiter nodes per replica set (default 0).'),
  rsMembers: z
    .array(rsMemberSchema)
    .min(1)
    .optional()
    .describe(
      'Explicit replica set members; overrides secondaries/arbiters. Use this for analytics nodes or custom priorities.',
    ),
  shards: z
    .union([z.number().int().min(1), z.array(shardSchema).min(1)])
    .optional()
    .describe(
      'Number of shards (default 3), or an explicit list of replica set configurations. When a list is given the first entry is the config server and every following entry is a shard.',
    ),
  mongosArgs: z
    .array(z.array(z.string()))
    .optional()
    .describe(
      'Arguments for each mongos router, one entry per router. Defaults to a single mongos. Each entry is combined with args.',
    ),
  slsDir: z
    .string()
    .optional()
    .describe(
      'Start a DSC cluster: path to the buildscripts/modules/atlas directory of a disaggregated-storage-capable MongoDB build (or any parent containing it). Requires Docker with compose v2, SLS image access and a DSC-capable mongod via binDir or downloadUrl.',
    ),
  slsImageTag: z
    .string()
    .optional()
    .describe(
      'SLS docker image tag for DSC clusters. Defaults to the pinned_sls_commit in the manifest.json next to the compose file.',
    ),
};

export const stopClusterShape = {
  id: z.string().min(1).optional().describe('Id of the cluster to stop.'),
  all: z
    .boolean()
    .optional()
    .describe(
      'Stop every cluster tracked in the runner directory, including clusters started by the mongodb-runner CLI. Cannot be combined with id.',
    ),
};

const clusterIdField = z
  .string()
  .min(1)
  .describe(
    'Id of a running cluster, as returned by mongodb_start_cluster or mongodb_list_clusters.',
  );
const databaseField = z.string().min(1).describe('Database name.');
const collectionField = z.string().min(1).describe('Collection name.');
const ejsonObject = (description: string) =>
  z.record(z.string(), z.unknown()).describe(description);

export const runCommandShape = {
  clusterId: clusterIdField,
  database: z.string().min(1).describe('Database to run the command against.'),
  command: ejsonObject(
    'Database command document, as Extended JSON, e.g. { "distinct": "users", "key": "name" }.',
  ),
};

export const getClusterShape = {
  id: z
    .string()
    .min(1)
    .describe('Id of a running cluster, as returned by mongodb_start_cluster.'),
};

export const clusterLogsShape = {
  id: z
    .string()
    .min(1)
    .describe('Id of a running cluster, as returned by mongodb_start_cluster.'),
  tailLines: z
    .number()
    .int()
    .min(1)
    .max(1_000)
    .optional()
    .describe('Number of trailing lines to read per server (default 100).'),
};

export const saveFixtureShape = {
  clusterId: clusterIdField,
  database: databaseField,
  collection: collectionField,
  path: z
    .string()
    .min(1)
    .optional()
    .describe(
      'File to write. Defaults to .devtools-mcp/fixtures/<database>.<collection>.ejson in the working directory.',
    ),
  filter: ejsonObject(
    'Only save documents matching this filter, as Extended JSON.',
  ).optional(),
  limit: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe('Maximum documents to save. Defaults to all of them.'),
};

export const loadFixtureShape = {
  clusterId: clusterIdField,
  database: databaseField,
  collection: collectionField,
  path: z
    .string()
    .min(1)
    .optional()
    .describe(
      'File to read. Defaults to .devtools-mcp/fixtures/<database>.<collection>.ejson in the working directory.',
    ),
  drop: z
    .boolean()
    .optional()
    .describe('Drop the collection before inserting (default false).'),
  ordered: z
    .boolean()
    .optional()
    .describe('Insert in order and stop at the first error (default true).'),
};

const failPointModeSchema = z.union([
  z.literal('off'),
  z.literal('alwaysOn'),
  z.object({ times: z.number().int().min(1) }),
  z.object({ activationProbability: z.number().min(0).max(1) }),
]);

export const failPointShape = {
  clusterId: clusterIdField,
  name: z.string().min(1).describe('Fail point name, e.g. "failCommand".'),
  mode: failPointModeSchema.describe(
    'Fail point mode: "off", "alwaysOn", { "times": n } or { "activationProbability": p }.',
  ),
  data: ejsonObject('Optional fail point data document.').optional(),
};

export const startClusterInputSchema = z.object(startClusterShape);
export const stopClusterInputSchema = z.object(stopClusterShape);
export const runCommandInputSchema = z.object(runCommandShape);
export const getClusterInputSchema = z.object(getClusterShape);
export const clusterLogsInputSchema = z.object(clusterLogsShape);
export const saveFixtureInputSchema = z.object(saveFixtureShape);
export const loadFixtureInputSchema = z.object(loadFixtureShape);
export const failPointInputSchema = z.object(failPointShape);

export type StartClusterInput = z.infer<typeof startClusterInputSchema>;
export type StopClusterInput = z.infer<typeof stopClusterInputSchema>;
export type RSMemberInput = z.infer<typeof rsMemberSchema>;
export type ShardInput = z.infer<typeof shardSchema>;
export type UserInput = z.infer<typeof userSchema>;
export type RunCommandInput = z.infer<typeof runCommandInputSchema>;
export type GetClusterInput = z.infer<typeof getClusterInputSchema>;
export type ClusterLogsInput = z.infer<typeof clusterLogsInputSchema>;
export type SaveFixtureInput = z.infer<typeof saveFixtureInputSchema>;
export type LoadFixtureInput = z.infer<typeof loadFixtureInputSchema>;
export type FailPointInput = z.infer<typeof failPointInputSchema>;
