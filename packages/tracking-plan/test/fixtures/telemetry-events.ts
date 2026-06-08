/** Properties sent with every event. */
export interface CommonEventProperties {
  /** Unique identifier for the current session. */
  session_id: string;
}

/** Traits sent with identify calls. */
export interface IdentifyTraits {
  /** Unique identifier for the device. */
  device_id: string;
  /** The operating system platform. */
  platform: string;
}

/**
 * Fired when a connection to the server is established.
 * @category Connection
 */
export type ConnectionEvent = {
  name: 'Connection';
  payload: {
    /** Whether the target host is localhost. */
    is_localhost?: boolean;
  } & CommonEventProperties;
};

/**
 * Fired when a query is executed against a collection.
 * @category Query
 */
export type QueryExecutedEvent = {
  name: 'Query Executed';
  payload: {
    /** Whether the query includes a filter. */
    has_filter: boolean;
    /** The type of the collection. */
    collection_type: string;
  } & CommonEventProperties;
};

/**
 * Fired when the application starts up.
 * @category Lifecycle
 */
export type ApplicationLaunchedEvent = {
  name: 'Application Launched';
  payload: CommonEventProperties;
};

export type TelemetryEvent =
  | ConnectionEvent
  | QueryExecutedEvent
  | ApplicationLaunchedEvent;
