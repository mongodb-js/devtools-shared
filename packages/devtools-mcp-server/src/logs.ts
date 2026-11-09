import path from 'path';
import { promises as fs } from 'fs';
import type {
  MongoClusterSerializedProperties,
  MongoServerSerializedProperties,
} from '@mongodb-js/mongodb-runner';
import { flattenServers } from './registry';

/** Reading more than this from the end of a log file is not worth it. */
const MAX_TAIL_BYTES = 1_048_576;

export const DEFAULT_LOG_TAIL_LINES = 100;

export type ServerLog = {
  host: string;
  port?: number;
  type: 'mongod' | 'mongos';
  /** Log file path, or null when the server produced no log file. */
  path: string | null;
  lines: string[];
};

export function clusterLogDir(
  cluster: MongoClusterSerializedProperties,
): string | undefined {
  return cluster.options?.logDir;
}

/**
 * mongodb-runner names the log file `<binary>-<server uuid>-<timestamp>.log`
 * and does not record the timestamp, so the uuid prefix is what identifies it.
 */
function findServerLogFile(
  logDir: string,
  entries: string[],
  server: MongoServerSerializedProperties,
): string | undefined {
  const binary = server.isMongos ? 'mongos' : 'mongod';
  const matches = entries
    .filter(
      (name) =>
        name.startsWith(`${binary}-${server._id}-`) && name.endsWith('.log'),
    )
    .sort();
  const latest = matches[matches.length - 1];
  return latest ? path.join(logDir, latest) : undefined;
}

/** Returns the last `count` lines of a file, reading at most `MAX_TAIL_BYTES`. */
export async function tailFile(
  filePath: string,
  count: number,
): Promise<string[]> {
  const handle = await fs.open(filePath, 'r');
  try {
    const { size } = await handle.stat();
    const bytes = Math.min(size, MAX_TAIL_BYTES);
    const buffer = Buffer.alloc(bytes);
    await handle.read(buffer, 0, bytes, size - bytes);

    const lines = buffer.toString('utf8').split(/\r?\n/);
    // The first line may be cut in half unless the whole file was read.
    if (bytes < size) lines.shift();
    while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
    return lines.slice(-count);
  } finally {
    await handle.close();
  }
}

export async function readClusterLogs(
  cluster: MongoClusterSerializedProperties,
  { tailLines }: { tailLines: number },
): Promise<ServerLog[]> {
  const logDir = clusterLogDir(cluster);
  if (!logDir) {
    throw new Error(
      'This cluster was started without a log directory, so there are no logs to read.',
    );
  }

  const entries = await fs
    .readdir(logDir)
    .catch((err: NodeJS.ErrnoException) => {
      if (err.code === 'ENOENT') return [] as string[];
      throw err;
    });

  return Promise.all(
    flattenServers(cluster).map(async (server) => {
      const filePath = findServerLogFile(logDir, entries, server);
      return {
        host: server.host ?? '127.0.0.1',
        port: server.port,
        type: server.isMongos ? ('mongos' as const) : ('mongod' as const),
        path: filePath ?? null,
        lines: filePath ? await tailFile(filePath, tailLines) : [],
      };
    }),
  );
}
