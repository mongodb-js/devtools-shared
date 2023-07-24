import type { Readable } from 'stream';
import { PassThrough } from 'stream';
import { createInterface as createReadlineInterface } from 'readline';

export async function* createLogEntryIterator(
  stdout: Readable
): AsyncIterable<LogEntry> {
  for await (const line of createReadlineInterface({ input: stdout })) {
    if (!line.trim()) {
      continue;
    }
    try {
      const logEntry = parseAnyLogEntry(line);
      yield logEntry;
    } catch (error: any) {
      break;
    }
  }
}

/** A parsed MongoDB log entry. */
export type LogEntry = {
  timestamp: string;
  severity: string;
  component: string;
  context: string;
  message: string;
  id: number | undefined;
  attr: any;
};

/**
 * Parse a log line from mongod < 4.4, i.e. before structured logging came into
 * existence. You may have seen code like this before. :)
 *
 * @param line The MongoDB logv1 line.
 * @returns The parsed line information.
 */
function parseOldLogEntry(line: string): LogEntry {
  const re =
    /^(?<timestamp>\S*) *(?<severity>\S*) *(?<component>\S*) *\[(?<context>[^\]]+)\]\s*(?<message>.*)$/;
  const match = re.exec(line.trim());
  if (!match) {
    throw new Error(`Could not parse line ${JSON.stringify(line)}`);
  }
  return match.groups as unknown as LogEntry;
}

/**
 * Parse a JSON (logv2) or legacy (logv1) log message.
 *
 * @param line The MongoDB log line.
 * @returns The parsed line information.
 */
export function parseAnyLogEntry(line: string): LogEntry {
  try {
    const newFormat = JSON.parse(line);
    return {
      id: newFormat.id,
      timestamp: newFormat.t?.$date,
      severity: newFormat.s,
      component: newFormat.c,
      context: newFormat.ctx,
      message: newFormat.msg,
      attr: newFormat.attr,
    };
  } catch {
    return parseOldLogEntry(line);
  }
}

export function isFailureToSetupListener(entry: LogEntry): boolean {
  return (
    entry.id === 22856 /* Error setting up listener */ ||
    entry.message.includes('Failed to set up listener')
  );
}

/**
 * Look at a log entry to figure out whether we are listening on a
 * TCP port.
 *
 * @param logEntry A parsed mongodb log line.
 * @returns The port in question, or an -1 if the log line did not match.
 */
function getPortFromLogEntry(logEntry: LogEntry): number {
  let match;
  // Log message id 23016 has the format
  // { t: <timestamp>, s: 'I', c: 'NETWORK', id: 23016, ctx: 'listener', msg: '...', attr: { port: 27020 } }
  if (logEntry.id === 23016) {
    return logEntry.attr.port;
  }
  // Or, 4.2-style: <timestamp> I  NETWORK  [listener] waiting for connections on port 27020
  if (
    logEntry.id === undefined &&
    (match = /^waiting for connections on port (?<port>\d+)( ssl)?$/i.exec(
      logEntry.message
    ))
  ) {
    return +(match.groups?.port ?? '0');
  }
  if (isFailureToSetupListener(logEntry)) {
    throw new Error(
      `Failed to setup listener (${logEntry.message} ${JSON.stringify(
        logEntry.attr
      )})`
    );
  }
  return -1;
}

/**
 * Go through a stream of parsed log entry objects and return the port/path
 * data once found.
 *
 * @input A mongodb logv2/logv1 stream.
 * @returns The port that the target process is listening on.
 */
export async function filterLogStreamForPort(
  input: Readable
): Promise<{ port: number }> {
  let port = -1;
  const inputDuplicate = input.pipe(new PassThrough({ objectMode: true }));

  try {
    for await (const logEntry of inputDuplicate as AsyncIterable<LogEntry>) {
      if (
        logEntry.component !== 'NETWORK' ||
        !['initandlisten', 'listener', 'mongosMain'].includes(logEntry.context)
      ) {
        continue; // We are only interested in listening network events
      }
      port = getPortFromLogEntry(logEntry);
      if (port !== -1) {
        break;
      }
    }
  } finally {
    input.unpipe(inputDuplicate);
  }
  return { port };
}

export type BuildInfo = { version: string | null; modules: string[] | null };

/**
 * Look at a log entry and return the build info data, if set.
 *
 * @param logEntry A parsed mongodb log line.
 * @returns Partial build info.
 */
function getBuildInfoFromLogEntry(logEntry: LogEntry): Partial<BuildInfo> {
  let match;
  // Log message id 23403 has the format
  // { t: <timestamp>, s: 'I', c: 'CONTROL', id: 23403, ctx: 'initandlisten', msg: '...', attr: { buildInfO: { ... } } }
  if (logEntry.id === 23403) {
    return logEntry.attr.buildInfo;
  }
  // Or, 4.2-style, split across multiple lines
  if (
    logEntry.id === undefined &&
    (match = /^(?:db|mongos) version v(?<version>.+)$/i.exec(logEntry.message))
  ) {
    return { version: match.groups?.version };
  }
  if (
    logEntry.id === undefined &&
    (match = /^modules: (?<moduleList>.+)$/i.exec(logEntry.message))
  ) {
    return {
      modules: match.groups?.moduleList
        ?.split(' ')
        ?.filter((module) => module !== 'none'),
    };
  }
  return {};
}

/**
 * Go through a stream of parsed log entry objects and return the build info
 * for that server.
 *
 * @input A mongodb logv2/logv1 stream.
 * @returns The build info.
 */
export async function filterLogStreamForBuildInfo(
  input: Readable
): Promise<BuildInfo> {
  let buildInfo: BuildInfo = { version: null, modules: null };
  const inputDuplicate = input.pipe(new PassThrough({ objectMode: true }));

  try {
    for await (const logEntry of inputDuplicate as AsyncIterable<LogEntry>) {
      if (
        logEntry.component !== 'CONTROL' ||
        !['initandlisten', 'listener'].includes(logEntry.context)
      ) {
        continue; // We are only interested in startup events
      }
      buildInfo = { ...buildInfo, ...getBuildInfoFromLogEntry(logEntry) };
      if (buildInfo.version) {
        break;
      }
    }
  } finally {
    input.unpipe(inputDuplicate);
  }
  return buildInfo;
}
