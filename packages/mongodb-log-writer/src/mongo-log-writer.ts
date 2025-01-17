import { EJSON } from 'bson';
import { Writable } from 'stream';
import { inspect } from 'util';

type PlainWritable = Pick<Writable, 'write' | 'end'>;

/**
 * A unique correlation ID for log lines. Always create these
 * using {@link mongoLogId()}, never directly.
 */
export interface MongoLogId {
  /** @internal */
  __value: number;
}

/** Create an ID for a given log line. */
export function mongoLogId(id: number): MongoLogId {
  return { __value: id };
}

/**
 * An unformatted MongoDB log entry.
 * @see {@link https://www.mongodb.com/docs/manual/reference/log-messages/#structured-logging}
 */
export interface MongoLogEntry {
  /** Timestamp at which the log event occurred */
  t?: Date;
  /** Severity field */
  s: 'F' | 'E' | 'W' | 'I' | 'D1' | 'D2' | 'D3' | 'D4' | 'D5';
  /** Component field */
  c: string;
  /** The message id field */
  id: MongoLogId;
  /** The context field */
  ctx: string;
  /** The message string field */
  msg: string;
  /** Additional information about the event in question */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attr?: any;
}

/**
 * Verify that a given {@link MongoLogEntry} contains all necessary fields.
 * @returns Either a TypeError if the log entry is invalid, or null.
 */
function validateLogEntry(info: MongoLogEntry): Error | null {
  if (typeof info.s !== 'string') {
    return new TypeError('Cannot log messages without a severity field');
  }
  if (typeof info.c !== 'string') {
    return new TypeError('Cannot log messages without a component field');
  }
  if (typeof info.id?.__value !== 'number') {
    return new TypeError('Cannot log messages without an id field');
  }
  if (typeof info.ctx !== 'string') {
    return new TypeError('Cannot log messages without a context field');
  }
  if (typeof info.msg !== 'string') {
    return new TypeError('Cannot log messages without a message field');
  }
  return null;
}

/**
 * A helper class for writing formatted log information to an output stream.
 * This class itself is an object-mode Writable stream to which
 * {@link MongoLogEntry} objects can be written.
 *
 * This class does not do any I/O of its own, and only delegates that to
 * the target stream.
 */
export class MongoLogWriter extends Writable {
  _logId: string;
  _logFilePath: string | null;
  _target: PlainWritable;
  _now: () => Date;

  /**
   * @param logId A unique identifier for this log file. This is not used outside the `logId` getter.
   * @param logFilePath The target path for this log file, if any. This is not used outside the `logFilePath` getter.
   * @param target The Writable stream to write data to.
   * @param now An optional function that overrides computation of the current time. This is used for testing.
   */
  constructor(
    logId: string,
    logFilePath: string | null,
    target: PlainWritable,
    now?: () => Date
  ) {
    super({ objectMode: true });
    this._logId = logId;
    this._logFilePath = logFilePath;
    this._target = target;
    this._now = now ?? (() => new Date());
  }

  /** Return the logId passed to the constructor. */
  get logId(): string {
    return this._logId;
  }

  /** Return the logFilePath passed to the constructor. */
  get logFilePath(): string | null {
    return this._logFilePath;
  }

  /** Return the target stream that was used to create this MongoLogWriter instance. */
  get target(): PlainWritable {
    return this._target;
  }

  _write(
    info: MongoLogEntry,
    encoding: unknown,
    callback: (err?: Error | null | undefined) => void
  ): void {
    const validationError = validateLogEntry(info);
    if (validationError) {
      callback(validationError);
      return;
    }

    // Copy the object to ensure the order of properties.
    const fullInfo: Omit<MongoLogEntry, 'id'> & { id: number } = {
      t: info.t ?? this._now(),
      s: info.s,
      c: info.c,
      id: info.id.__value,
      ctx: info.ctx,
      msg: info.msg,
    };

    if (info.attr) {
      if (Object.prototype.toString.call(info.attr) === '[object Error]') {
        fullInfo.attr = {
          stack: info.attr.stack,
          name: info.attr.name,
          message: info.attr.message,
          code: info.attr.code,
          ...info.attr,
        };
      } else {
        fullInfo.attr = info.attr;
      }
    }

    this.emit('log', fullInfo);

    // The attr field may contain arbitrary data. If we cannot serialize it,
    // we fall back to increasingly less faithful representations of it.
    try {
      EJSON.stringify(fullInfo.attr);
    } catch {
      try {
        // This package may be running in a web environment
        // where v8 is not available.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const v8 = require('v8');
        const cloned = v8.deserialize(v8.serialize(fullInfo.attr));
        EJSON.stringify(cloned);
        fullInfo.attr = cloned;
      } catch {
        try {
          const cloned = JSON.parse(JSON.stringify(fullInfo.attr));
          EJSON.stringify(cloned);
          fullInfo.attr = cloned;
        } catch {
          fullInfo.attr = { _inspected: inspect(fullInfo.attr) };
        }
      }
    }
    this._target.write(
      EJSON.stringify(fullInfo, { relaxed: true }) + '\n',
      callback
    );
  }

  _final(callback: (err?: Error | null | undefined) => void): void {
    this._target.end(callback);
  }

  /** Wait until all pending data has been written to the underlying stream. */
  async flush(): Promise<void> {
    await new Promise((resolve) => this._target.write('', resolve));
  }

  /**
   * Write a log entry with severity 'I'.
   */
  info(
    component: string,
    id: MongoLogId,
    context: string,
    message: string,
    attr?: unknown
  ): void {
    const logEntry: MongoLogEntry = {
      s: 'I',
      c: component,
      id: id,
      ctx: context,
      msg: message,
      attr: attr,
    };
    this.write(logEntry);
  }

  /**
   * Write a log entry with severity 'W'.
   */
  warn(
    component: string,
    id: MongoLogId,
    context: string,
    message: string,
    attr?: unknown
  ): void {
    const logEntry: MongoLogEntry = {
      s: 'W',
      c: component,
      id: id,
      ctx: context,
      msg: message,
      attr: attr,
    };
    this.write(logEntry);
  }

  /**
   * Write a log entry with severity 'E'.
   */
  error(
    component: string,
    id: MongoLogId,
    context: string,
    message: string,
    attr?: unknown
  ): void {
    const logEntry: MongoLogEntry = {
      s: 'E',
      c: component,
      id: id,
      ctx: context,
      msg: message,
      attr: attr,
    };
    this.write(logEntry);
  }

  /**
   * Write a log entry with severity 'F'.
   */
  fatal(
    component: string,
    id: MongoLogId,
    context: string,
    message: string,
    attr?: unknown
  ): void {
    const logEntry: MongoLogEntry = {
      s: 'F',
      c: component,
      id: id,
      ctx: context,
      msg: message,
      attr: attr,
    };
    this.write(logEntry);
  }

  /**
   * Write a log entry with severity 'D'.
   */
  debug(
    component: string,
    id: MongoLogId,
    context: string,
    message: string,
    attr?: unknown,
    level: 1 | 2 | 3 | 4 | 5 = 1
  ): void {
    const logEntry: MongoLogEntry = {
      s: `D${level}`,
      c: component,
      id: id,
      ctx: context,
      msg: message,
      attr: attr,
    };
    this.write(logEntry);
  }

  /**
   * Create a MongoLogWriter-like object with a bound 'component' value
   */
  bindComponent(component: string): {
    unbound: MongoLogWriter;
    component: string;
    write(
      entry: Omit<MongoLogEntry, 'c'>,
      cb?: (error?: Error | null) => void
    ): boolean;
    info(
      id: MongoLogId,
      context: string,
      message: string,
      attr?: unknown
    ): void;
    warn(
      id: MongoLogId,
      context: string,
      message: string,
      attr?: unknown
    ): void;
    error(
      id: MongoLogId,
      context: string,
      message: string,
      attr?: unknown
    ): void;
    fatal(
      id: MongoLogId,
      context: string,
      message: string,
      attr?: unknown
    ): void;
    debug(
      id: MongoLogId,
      context: string,
      message: string,
      attr?: unknown,
      level?: 1 | 2 | 3 | 4 | 5
    ): void;
  } {
    return {
      unbound: this,
      component: component,
      write: (entry, cb) => this.write({ c: component, ...entry }, cb),
      info: this.info.bind(this, component),
      warn: this.warn.bind(this, component),
      error: this.error.bind(this, component),
      fatal: this.fatal.bind(this, component),
      debug: this.debug.bind(this, component),
    };
  }

  mongoLogId = mongoLogId;
}
