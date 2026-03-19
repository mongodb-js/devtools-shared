// Compatible with mongodb-runner's LogEntry type, but we
// want to avoid depending on the entire package just for that.
export type LogEntry = {
  timestamp: string;
  severity: string;
  component: string;
  context: string;
  message: string;
  id: number | undefined;
  attr: any;
};

export interface MongoLogEventEmitter {
  on(
    event: 'mongoLog',
    listener: (serverUUID: string, entry: LogEntry) => void,
  ): void;
  off(
    event: 'mongoLog',
    listener: (serverUUID: string, entry: LogEntry) => void,
  ): void;
}

/**
 * Filter for allowing specific server warnings.
 * Can be a numeric log ID or a predicate function.
 */
export type WarningFilter = number | ((entry: LogEntry) => boolean);

/**
 * Monitors MongoDB server logs and validates that no unexpected warnings occur.
 * Modeled after the mongosh implementation in PR #2574.
 */
export class ServerLogsChecker implements Disposable {
  static defaultAllowedWarnings: WarningFilter[] = [
    4615610, // "Failed to check socket connectivity", generic disconnect error
    7012500, // "Failed to refresh query analysis configurations", normal sharding behavior
    4906901, // "Arbiters are not supported in quarterly binary versions"
    6100702, // "Failed to get last stable recovery timestamp due to lock acquire timeout. Note this is expected if shutdown is in progress."
    20525, // "Failed to gather storage statistics for slow operation"
    22120, // "Access control is not enabled for the database"
    22140, // "This server is bound to localhost"
    22178, // "transparent_hugepage/enabled is 'always'"
    5123300, // "vm.max_map_count is too low"
    551190, // "Server certificate has no compatible Subject Alternative Name",
    20526, // "Failed to gather storage statistics for slow operation"
    22668, // "Unable to ping distributed locks"
    21764, // "Unable to forward progress" REPL
    22225, // "Flow control is engaged and the sustainer point is not moving. Please check the health of all secondaries."
    2658100, // "Hinted index could not provide a bounded scan, reverting to whole index scan"
    (l: LogEntry) => {
      // "Use of deprecated server parameter name" (FTDC)
      return (l.id === 636300 || l.id === 23803) && l.context === 'ftdc';
    },
    (l: LogEntry) => l.component === 'STORAGE', // Outside of mongosh's control
    (l: LogEntry) => l.context === 'BackgroundSync', // Outside of mongosh's control
    (l: LogEntry) => {
      // "Aggregate command executor error", we get this a lot for things like
      // $collStats which internally tries to open collections that may or may not exist
      return (
        l.id === 23799 &&
        [
          'NamespaceNotFound',
          'ShardNotFound',
          'CommandNotSupportedOnView',
        ].includes(l.attr?.error?.codeName)
      );
    },
    (l: LogEntry) => {
      // "getMore command executor error" can happen under normal circumstances
      // for client errors
      return l.id === 20478 && l.attr?.error?.codeName === 'ClientDisconnect';
    },
    (l: LogEntry) => {
      // "$jsonSchema validator does not allow '_id' field" warning
      // incorrectly issued for the implicit schema of config.settings
      // https://github.com/mongodb/mongo/blob/0c265adbde984c981946f804279693078e0b9f8a/src/mongo/db/global_catalog/ddl/sharding_catalog_manager.cpp#L558-L559
      // https://github.com/mongodb/mongo/blob/0c265adbde984c981946f804279693078e0b9f8a/src/mongo/s/balancer_configuration.cpp#L122-L143
      return (
        l.id === 3216000 &&
        ['ReplWriterWorker', 'OplogApplier'].some((match) =>
          l.context.includes(match),
        )
      );
    },
    (l: LogEntry) => {
      // "Deprecated operation requested" for OP_QUERY which drivers may
      // still send in limited situations until NODE-6287 is done
      return l.id === 5578800 && l.attr?.op === 'query';
    },
  ];

  private collectedWarnings: LogEntry[] = [];
  private warningFilters: ((entry: LogEntry) => boolean)[] = [];
  private cluster: MongoLogEventEmitter;
  private ignoreCtx: Set<string> = new Set();

  constructor(cluster: MongoLogEventEmitter) {
    this.cluster = cluster;
    // Add default warning filters
    for (const filter of ServerLogsChecker.defaultAllowedWarnings) {
      this.allowWarning(filter);
    }

    // Subscribe to mongoLog events
    this.cluster.on('mongoLog', this.listener);
  }

  private listener: (serverUUID: string, entry: LogEntry) => void = (
    serverUUID: string,
    entry: LogEntry,
  ) => {
    const crossServerCtxID = `${serverUUID}\0${entry.context}`;
    // Ignore events coming from internal clients (e.g. replset clients)
    if (
      entry.id === 51800 &&
      entry.attr?.doc?.driver?.name === 'MongoDB Internal Client' &&
      entry.context.startsWith('conn')
    ) {
      this.ignoreCtx.add(crossServerCtxID);
    }
    if (this.ignoreCtx.has(crossServerCtxID)) return;

    // Only collect warnings (W), errors (E), and fatal (F) severity logs
    // Apply filters at collection time - filtered warnings are never stored
    if (
      (entry.severity === 'W' ||
        entry.severity === 'E' ||
        entry.severity === 'F') &&
      !this.warningFilters.some((filter) => filter(entry))
    ) {
      this.collectedWarnings.push(entry);
    }
  };

  /**
   * Get a copy of the collected warnings.
   */
  get warnings(): LogEntry[] {
    return [...this.collectedWarnings];
  }

  /**
   * Allow a specific warning to pass validation.
   * Must be called BEFORE the warning occurs (filters are applied at collection time).
   * @param filter - A log ID (number) or predicate function
   * @returns A function to unsubscribe this filter
   */
  allowWarning(filter: WarningFilter): () => void {
    const filterFn =
      typeof filter === 'number'
        ? (entry: LogEntry) => entry.id === filter
        : filter;

    this.warningFilters.push(filterFn);
    return () => {
      const index = this.warningFilters.indexOf(filterFn);
      if (index !== -1) {
        this.warningFilters.splice(index, 1);
      }
    };
  }

  /**
   * Check for unexpected warnings and throw if any are found.
   * Clears the collected warnings after checking.
   */
  noServerWarningsCheckpoint(): void {
    const warnings = this.warnings;
    this.collectedWarnings = [];

    if (warnings.length > 0) {
      const warningDetails = warnings
        .map((w) => `  - [${w.severity}] ID:${w.id ?? 'unknown'} ${w.message}`)
        .join('\n');
      throw new Error(
        `Unexpected server warnings detected:\n${warningDetails}`,
      );
    }
  }

  /**
   * Stop listening to log events.
   */
  close(): void {
    this.cluster.off('mongoLog', this.listener);
  }

  /** Disposable alias for close() */
  [Symbol.dispose](): void {
    this.close();
  }
}
