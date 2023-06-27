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
    (match = /^waiting for connections on port (?<port>\d+)$/i.exec(
      logEntry.message
    ))
  ) {
    return +(match.groups?.port ?? '0');
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
        !['initandlisten', 'listener'].includes(logEntry.context)
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