import { ProxyEventMap } from '@mongodb-js/devtools-proxy-support';
import type { MongoDBOIDCLogEventsMap } from '@mongodb-js/oidc-plugin';

export interface ConnectAttemptInitializedEvent {
  uri: string;
  driver: { name: string; version: string };
  devtoolsConnectVersion: string;
  host: string;
}

export interface ConnectAttemptFinishedEvent {
  cryptSharedLibVersionInfo?: {
    version: bigint;
    versionStr: string;
  } | null;
}

export interface ConnectHeartbeatFailureEvent {
  connectionId: string;
  failure: Error;
  isFailFast: boolean;
  isKnownServer: boolean;
}

export interface ConnectHeartbeatSucceededEvent {
  connectionId: string;
}

export interface ConnectDnsResolutionDetail {
  query: 'TXT' | 'SRV';
  hostname: string;
  error?: string;
  wasNativelyLookedUp?: boolean;
  durationMs: number;
}

export interface ConnectResolveSrvErrorEvent {
  from: string;
  error: Error;
  duringLoad: boolean;
  resolutionDetails: ConnectDnsResolutionDetail[];
  durationMs: number | null;
}

export interface ConnectResolveSrvSucceededEvent {
  from: string;
  to: string;
  resolutionDetails: ConnectDnsResolutionDetail[];
  durationMs: number | null;
}

export interface ConnectMissingOptionalDependencyEvent {
  name: string;
  error: Error;
}

export interface ConnectUsedSystemCAEvent {
  caCount: number;
  asyncFallbackError: Error | undefined;
  systemCertsError: Error | undefined;
  messages: string[];
}

export interface ConnectRetryAfterTLSErrorEvent {
  error: string;
}

export interface ConnectEventMap
  extends MongoDBOIDCLogEventsMap,
    ProxyEventMap {
  /** Signals that a connection attempt is about to be performed. */
  'devtools-connect:connect-attempt-initialized': (
    ev: ConnectAttemptInitializedEvent,
  ) => void;
  /** Signals that communicating to a specific server during connection did not succeed. */
  'devtools-connect:connect-heartbeat-failure': (
    ev: ConnectHeartbeatFailureEvent,
  ) => void;
  /** Signals that communicating to a specific server during connection succeeded. */
  'devtools-connect:connect-heartbeat-succeeded': (
    ev: ConnectHeartbeatSucceededEvent,
  ) => void;
  /** Signals that the service provider failed to connect because it deemed further attempts futile. */
  'devtools-connect:connect-fail-early': () => void;
  /** Signals that the service provider finished attempting to connect, regardless of success. */
  'devtools-connect:connect-attempt-finished': (
    ev: ConnectAttemptFinishedEvent,
  ) => void;
  /** Signals that resolving an mongodb+srv:// URL failed. */
  'devtools-connect:resolve-srv-error': (
    ev: ConnectResolveSrvErrorEvent,
  ) => void;
  /** Signals that resolving an mongodb+srv:// URL succeeded. */
  'devtools-connect:resolve-srv-succeeded': (
    ev: ConnectResolveSrvSucceededEvent,
  ) => void;
  /** Signals that an optional dependency of the mongodb package is missing. */
  'devtools-connect:missing-optional-dependency': (
    ev: ConnectMissingOptionalDependencyEvent,
  ) => void;
  /** Signals that the list of system certificates has been loaded and used for connecting. */
  'devtools-connect:used-system-ca': (ev: ConnectUsedSystemCAEvent) => void;
  /** Signals that a connection attempt was restarted after a TLS error */
  'devtools-connect:retry-after-tls-error': (
    ev: ConnectRetryAfterTLSErrorEvent,
  ) => void;
}

export type ConnectEventArgs<K extends keyof ConnectEventMap> =
  ConnectEventMap[K] extends (...args: infer P) => any ? P : never;

export interface ConnectLogEmitter {
  // TypeScript uses something like this itself for its EventTarget definitions.
  on<K extends keyof ConnectEventMap>(
    event: K,
    listener: ConnectEventMap[K],
  ): this;
  off?<K extends keyof ConnectEventMap>(
    event: K,
    listener: ConnectEventMap[K],
  ): this;
  once<K extends keyof ConnectEventMap>(
    event: K,
    listener: ConnectEventMap[K],
  ): this;
  emit<K extends keyof ConnectEventMap>(
    event: K,
    ...args: ConnectEventArgs<K>
  ): unknown;
}
