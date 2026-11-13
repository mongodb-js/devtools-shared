import type { MongoClient } from 'mongodb';
import {
  MongoCluster,
  type MongoClusterSerializedProperties,
} from '@mongodb-js/mongodb-runner';

/** Fail fast when the cluster is gone instead of waiting for the driver default (30s). */
export const SERVER_SELECTION_TIMEOUT_MS = 5_000;

export type ClusterVariant = 'enterprise' | 'community';

export interface ClusterInspection {
  version: string;
  variant: ClusterVariant;
}

export type ClusterInspector = (
  serialized: MongoClusterSerializedProperties,
) => Promise<ClusterInspection>;

/**
 * Reconnects through mongodb-runner's serialized cluster metadata so that
 * authentication, TLS options, the replica set name and the topology's write
 * concern are all applied.
 */
export async function withClusterClient<T>(
  serialized: MongoClusterSerializedProperties,
  fn: (client: MongoClient) => Promise<T>,
): Promise<T> {
  const cluster = await MongoCluster.deserialize(serialized);
  return cluster.withClient(fn, {
    serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
  });
}

/** Connects and reads the server version, which also answers "is it alive?". */
export const inspectCluster: ClusterInspector = (serialized) =>
  withClusterClient(serialized, async (client) => {
    const buildInfo = await client.db('admin').command({ buildInfo: 1 });
    return {
      version: String(buildInfo.version),
      variant: buildInfo.modules?.includes('enterprise')
        ? 'enterprise'
        : 'community',
    };
  });
