import type {
  ConnectAttemptInitializedEvent,
  ConnectAttemptFinishedEvent,
  ConnectHeartbeatFailureEvent,
  ConnectHeartbeatSucceededEvent,
  ConnectResolveSrvErrorEvent,
  ConnectResolveSrvSucceededEvent,
  ConnectMissingOptionalDependencyEvent,
  ConnectUsedSystemCAEvent,
  ConnectLogEmitter,
  ConnectRetryAfterTLSErrorEvent,
} from './types';

import {
  hookLoggerToMongoLogWriter as oidcHookLogger,
  MongoLogWriter as OIDCMongoLogWriter,
} from '@mongodb-js/oidc-plugin';
import {
  hookLogger as proxyHookLogger,
  MongoLogWriter as ProxyMongoLogWriter,
} from '@mongodb-js/devtools-proxy-support';

export interface MongoLogWriter
  extends OIDCMongoLogWriter, ProxyMongoLogWriter {}

export function hookLogger(
  emitter: ConnectLogEmitter,
  log: MongoLogWriter,
  contextPrefix: string,
  redactConnectionString: (uri: string) => string,
): void {
  oidcHookLogger(emitter, log, contextPrefix);
  proxyHookLogger(emitter, log, contextPrefix);

  const { mongoLogId } = log;
  emitter.on(
    'devtools-connect:connect-attempt-initialized',
    function (ev: ConnectAttemptInitializedEvent) {
      log.info(
        'DEVTOOLS-CONNECT',
        mongoLogId(1_000_000_042),
        `${contextPrefix}-connect`,
        'Initiating connection attempt',
        {
          ...ev,
          uri: redactConnectionString(ev.uri),
        },
      );
    },
  );

  emitter.on(
    'devtools-connect:connect-heartbeat-failure',
    function (ev: ConnectHeartbeatFailureEvent) {
      log.warn(
        'DEVTOOLS-CONNECT',
        mongoLogId(1_000_000_034),
        `${contextPrefix}-connect`,
        'Server heartbeat failure',
        {
          ...ev,
          failure: ev.failure?.message,
        },
      );
    },
  );

  emitter.on(
    'devtools-connect:connect-heartbeat-succeeded',
    function (ev: ConnectHeartbeatSucceededEvent) {
      log.info(
        'DEVTOOLS-CONNECT',
        mongoLogId(1_000_000_035),
        `${contextPrefix}-connect`,
        'Server heartbeat succeeded',
        ev,
      );
    },
  );

  emitter.on('devtools-connect:connect-fail-early', function () {
    log.warn(
      'DEVTOOLS-CONNECT',
      mongoLogId(1_000_000_036),
      `${contextPrefix}-connect`,
      'Aborting connection attempt as irrecoverable',
    );
  });

  emitter.on(
    'devtools-connect:connect-attempt-finished',
    function (ev: ConnectAttemptFinishedEvent) {
      let attr: any;
      if (ev.cryptSharedLibVersionInfo) {
        attr = {
          cryptSharedLibVersionInfo: {
            version: ev.cryptSharedLibVersionInfo.version.toString(16),
            versionStr: ev.cryptSharedLibVersionInfo.versionStr,
          },
        };
      }
      log.info(
        'DEVTOOLS-CONNECT',
        mongoLogId(1_000_000_037),
        `${contextPrefix}-connect`,
        'Connection attempt finished',
        attr,
      );
    },
  );

  emitter.on(
    'devtools-connect:resolve-srv-error',
    function (ev: ConnectResolveSrvErrorEvent) {
      log.error(
        'DEVTOOLS-CONNECT',
        mongoLogId(1_000_000_038),
        `${contextPrefix}-connect`,
        'Resolving SRV record failed',
        {
          from: redactConnectionString(ev.from),
          error: ev.error?.message,
          duringLoad: ev.duringLoad,
          resolutionDetails: ev.resolutionDetails,
          durationMs: ev.durationMs,
        },
      );
    },
  );

  emitter.on(
    'devtools-connect:resolve-srv-succeeded',
    function (ev: ConnectResolveSrvSucceededEvent) {
      log.info(
        'DEVTOOLS-CONNECT',
        mongoLogId(1_000_000_039),
        `${contextPrefix}-connect`,
        'Resolving SRV record succeeded',
        {
          from: redactConnectionString(ev.from),
          to: redactConnectionString(ev.to),
          resolutionDetails: ev.resolutionDetails,
          durationMs: ev.durationMs,
        },
      );
    },
  );

  emitter.on(
    'devtools-connect:missing-optional-dependency',
    function (ev: ConnectMissingOptionalDependencyEvent) {
      log.error(
        'DEVTOOLS-CONNECT',
        mongoLogId(1_000_000_041),
        `${contextPrefix}-deps`,
        'Missing optional dependency',
        {
          name: ev.name,
          error: ev.error.message,
        },
      );
    },
  );

  emitter.on(
    'devtools-connect:used-system-ca',
    function (ev: ConnectUsedSystemCAEvent) {
      log.info(
        'DEVTOOLS-CONNECT',
        mongoLogId(1_000_000_049),
        `${contextPrefix}-connect`,
        'Loaded system CA list',
        {
          caCount: ev.caCount,
          asyncFallbackError: ev.asyncFallbackError?.message,
          systemCertsError: ev.systemCertsError?.message,
          messages: ev.messages,
        },
      );
    },
  );

  emitter.on(
    'devtools-connect:retry-after-tls-error',
    function (ev: ConnectRetryAfterTLSErrorEvent) {
      log.info(
        'DEVTOOLS-CONNECT',
        mongoLogId(1_000_000_054),
        `${contextPrefix}-connect`,
        'Restarting connection attempt after TLS error',
        {
          error: ev.error,
        },
      );
    },
  );
}
