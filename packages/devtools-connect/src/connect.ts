import type { ConnectLogEmitter } from './index';
import dns from 'dns';
import {
  isFastFailureConnectionError,
  isPotentialTLSCertificateError,
} from './fast-failure-connect';
import type {
  MongoClient,
  MongoClientOptions,
  ServerHeartbeatFailedEvent,
  ServerHeartbeatSucceededEvent,
  TopologyDescription,
} from 'mongodb';
import type { ConnectDnsResolutionDetail } from './types';
import type {
  MongoDBOIDCPlugin,
  MongoDBOIDCPluginOptions,
} from '@mongodb-js/oidc-plugin';
import { createMongoDBOIDCPlugin } from '@mongodb-js/oidc-plugin';
import merge from 'lodash.merge';
import { oidcServerRequestHandler } from './oidc/handler';
import { StateShareClient, StateShareServer } from './ipc-rpc-state-share';
import ConnectionString, {
  CommaAndColonSeparatedRecord,
} from 'mongodb-connection-string-url';
import { EventEmitter } from 'events';
import {
  createSocks5Tunnel,
  DevtoolsProxyOptions,
  AgentWithInitialize,
  useOrCreateAgent,
  Tunnel,
  systemCA,
  createFetch,
} from '@mongodb-js/devtools-proxy-support';
export type { DevtoolsProxyOptions, AgentWithInitialize };

function isAtlas(str: string): boolean {
  try {
    const { hosts } = new ConnectionString(str);
    return hosts.every((host) => /(^|\.)mongodb.net(:|$)/.test(host));
  } catch {
    return false;
  }
}

export class MongoAutoencryptionUnavailable extends Error {
  constructor() {
    super(
      'Automatic encryption is only available with Atlas and MongoDB Enterprise',
    );
  }
}

/**
 * Takes an unconnected MongoClient and connects it, but fails fast for certain
 * errors.
 */
async function connectWithFailFast(
  uri: string,
  client: MongoClient,
  logger: ConnectLogEmitter,
): Promise<void> {
  const failedConnections = new Map<string, Error>();
  let failEarlyClosePromise: Promise<void> | null = null;
  logger.emit('devtools-connect:connect-attempt-initialized', {
    uri,
    driver: client.options.metadata.driver,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    devtoolsConnectVersion: require('../package.json').version,
    host: client.options.srvHost ?? client.options.hosts.join(','),
  });

  const heartbeatFailureListener = ({
    failure,
    connectionId,
  }: ServerHeartbeatFailedEvent) => {
    const topologyDescription: TopologyDescription | undefined = (client as any)
      .topology?.description;
    const servers = topologyDescription?.servers;
    const isFailFast = isFastFailureConnectionError(failure);
    const isKnownServer = !!servers?.has(connectionId);
    logger.emit('devtools-connect:connect-heartbeat-failure', {
      connectionId,
      failure,
      isFailFast,
      isKnownServer,
    });
    if (!isKnownServer) {
      return;
    }

    if (isFailFast && servers) {
      failedConnections.set(connectionId, failure);
      if (
        [...servers.keys()].every((server) => failedConnections.has(server))
      ) {
        logger.emit('devtools-connect:connect-fail-early');
        // Setting this variable indicates that we are failing early.
        failEarlyClosePromise = client.close();
      }
    }
  };

  const heartbeatSucceededListener = ({
    connectionId,
  }: ServerHeartbeatSucceededEvent) => {
    logger.emit('devtools-connect:connect-heartbeat-succeeded', {
      connectionId,
    });
    failedConnections.delete(connectionId);
  };

  client.addListener('serverHeartbeatFailed', heartbeatFailureListener);
  client.addListener('serverHeartbeatSucceeded', heartbeatSucceededListener);
  try {
    await client.connect();
  } catch (error: unknown) {
    let connectErr = error;
    if (failEarlyClosePromise !== null) {
      await (failEarlyClosePromise as Promise<void>);
      connectErr = failedConnections.values().next().value; // Just use the first failure.
    }
    if (
      typeof connectErr === 'object' &&
      connectErr?.constructor.name === 'MongoServerSelectionError' &&
      isAtlas(uri)
    ) {
      (connectErr as Error).message = `${
        (connectErr as Error).message
      }. It looks like this is a MongoDB Atlas cluster. Please ensure that your Network Access List allows connections from your IP.`;
    }
    throw connectErr;
  } finally {
    client.removeListener('serverHeartbeatFailed', heartbeatFailureListener);
    client.removeListener(
      'serverHeartbeatSucceeded',
      heartbeatSucceededListener,
    );
    logger.emit('devtools-connect:connect-attempt-finished', {
      cryptSharedLibVersionInfo: (client as any)?.autoEncrypter
        ?.cryptSharedLibVersionInfo,
    });
  }
}

let resolveDnsHelpers:
  | {
      // eslint-disable-next-line @typescript-eslint/consistent-type-imports
      resolve: typeof import('resolve-mongodb-srv');
      // eslint-disable-next-line @typescript-eslint/consistent-type-imports
      osDns: typeof import('os-dns-native');
    }
  | undefined;

async function resolveMongodbSrv(
  uri: string,
  logger: ConnectLogEmitter,
): Promise<string> {
  const resolutionDetails: ConnectDnsResolutionDetail[] = [];
  if (uri.startsWith('mongodb+srv://')) {
    try {
      resolveDnsHelpers ??= {
        resolve: require('resolve-mongodb-srv'),
        osDns: require('os-dns-native'),
      };
    } catch (error: any) {
      logger.emit('devtools-connect:resolve-srv-error', {
        from: '',
        error,
        duringLoad: true,
        resolutionDetails,
        durationMs: null,
      });
    }
    if (resolveDnsHelpers !== undefined) {
      const dnsResolutionStart = Date.now();
      try {
        const {
          wasNativelyLookedUp,
          withNodeFallback: { resolveSrv, resolveTxt },
        } = resolveDnsHelpers.osDns;
        const resolved = await resolveDnsHelpers.resolve(uri, {
          dns: {
            resolveSrv(hostname: string, cb: Parameters<typeof resolveSrv>[1]) {
              const start = Date.now();
              resolveSrv(
                hostname,
                (...args: Parameters<Parameters<typeof resolveSrv>[1]>) => {
                  resolutionDetails.push({
                    query: 'SRV',
                    hostname,
                    error: args[0]?.message,
                    wasNativelyLookedUp: wasNativelyLookedUp(args[1]),
                    durationMs: Date.now() - start,
                  });
                  cb(...args);
                },
              );
            },
            resolveTxt(hostname: string, cb: Parameters<typeof resolveTxt>[1]) {
              resolveTxt(
                hostname,
                (...args: Parameters<Parameters<typeof resolveTxt>[1]>) => {
                  const start = Date.now();
                  resolutionDetails.push({
                    query: 'TXT',
                    hostname,
                    error: args[0]?.message,
                    wasNativelyLookedUp: wasNativelyLookedUp(args[1]),
                    durationMs: Date.now() - start,
                  });
                  cb(...args);
                },
              );
            },
          },
        });
        logger.emit('devtools-connect:resolve-srv-succeeded', {
          from: uri,
          to: resolved,
          resolutionDetails,
          durationMs: Date.now() - dnsResolutionStart,
        });
        return resolved;
      } catch (error: any) {
        logger.emit('devtools-connect:resolve-srv-error', {
          from: uri,
          error,
          duringLoad: false,
          resolutionDetails,
          durationMs: Date.now() - dnsResolutionStart,
        });
        throw error;
      }
    }
  }
  return uri;
}

function detectAndLogMissingOptionalDependencies(logger: ConnectLogEmitter) {
  // These need to be literal require('string') calls for bundling purposes.
  try {
    require('socks');
  } catch (error: any) {
    logger.emit('devtools-connect:missing-optional-dependency', {
      name: 'socks',
      error,
    });
  }
  try {
    require('mongodb-client-encryption');
  } catch (error: any) {
    logger.emit('devtools-connect:missing-optional-dependency', {
      name: 'mongodb-client-encryption',
      error,
    });
  }
  try {
    require('os-dns-native');
  } catch (error: any) {
    logger.emit('devtools-connect:missing-optional-dependency', {
      name: 'os-dns-native',
      error,
    });
  }
  try {
    require('resolve-mongodb-srv');
  } catch (error: any) {
    logger.emit('devtools-connect:missing-optional-dependency', {
      name: 'resolve-mongodb-srv',
      error,
    });
  }
  try {
    require('kerberos');
  } catch (error: any) {
    logger.emit('devtools-connect:missing-optional-dependency', {
      name: 'kerberos',
      error,
    });
  }
}

// Override 'from.emit' so that all events also end up being emitted on 'to'
function copyEventEmitterEvents<M>(
  from: {
    emit: <K extends string & keyof M>(
      event: K,
      ...args: M[K] extends (...args: infer P) => any ? P : never
    ) => void;
  },
  to: {
    emit: <K extends string & keyof M>(
      event: K,
      ...args: M[K] extends (...args: infer P) => any ? P : never
    ) => void;
  },
) {
  from.emit = function <K extends string & keyof M>(
    event: K,
    ...args: M[K] extends (...args: infer P) => any ? P : never
  ) {
    to.emit(event, ...args);
    return EventEmitter.prototype.emit.call(this, event, ...args);
  };
}

// Wrapper for all state that a devtools application may want to share
// between MongoClient instances. Currently, this is only the OIDC state.
// There are two ways of sharing this state:
// - When re-used within the same process/address space, it can be passed
//   to `connectMongoClient()` as `parentState` directly.
// - When re-used across processes, an RPC server can be used over an IPC
//   channel by calling `.getStateShareServer()`, which returns a string
//   that can then be passed to `connectMongoClient()` as `parentHandle`
//   and which should be considered secret since it contains auth information
//   for that RPC server.
export class DevtoolsConnectionState {
  public oidcPlugin: MongoDBOIDCPlugin;
  public productName: string;

  private stateShareClient: StateShareClient | null = null;
  private stateShareServer: StateShareServer | null = null;

  constructor(
    options: Pick<
      DevtoolsConnectOptions,
      'productDocsLink' | 'productName' | 'oidc' | 'parentHandle'
    >,
    logger: ConnectLogEmitter,
  ) {
    this.productName = options.productName;
    if (options.parentHandle) {
      this.stateShareClient = new StateShareClient(options.parentHandle);
      this.oidcPlugin = this.stateShareClient.oidcPlugin;
    } else {
      // Create a separate logger instance for the plugin and "copy" events over
      // to the main logger instance, so that when we attach listeners to the plugins,
      // they are only triggered for events from that specific plugin instance
      // (and not other OIDCPlugin instances that might be running on the same logger).
      const proxyingLogger = new EventEmitter();
      proxyingLogger.setMaxListeners(Infinity);
      copyEventEmitterEvents(proxyingLogger, logger);
      this.oidcPlugin = createMongoDBOIDCPlugin({
        ...options.oidc,
        logger: proxyingLogger,
        redirectServerRequestHandler: oidcServerRequestHandler.bind(
          null,
          options,
        ),
      });
    }
  }

  async getStateShareServer(): Promise<string> {
    this.stateShareServer ??= await StateShareServer.create(this);
    return this.stateShareServer.handle;
  }

  async destroy(): Promise<void> {
    await this.stateShareServer?.close();
    await this.oidcPlugin?.destroy();
  }
}

export interface DevtoolsConnectOptions extends MongoClientOptions {
  /**
   * An URL that refers to the documentation for the current product.
   */
  productDocsLink: string;
  /**
   * A human-readable name for the current product (e.g. "MongoDB Compass").
   */
  productName: string;
  /**
   * A set of options to pass when creating the OIDC plugin. Ignored if `parentState` is set.
   */
  oidc?: Omit<
    MongoDBOIDCPluginOptions,
    'logger' | 'redirectServerRequestHandler'
  >;
  /**
   * A `DevtoolsConnectionState` object that refers to the state resulting from another
   * `connectMongoClient()` call.
   */
  parentState?: DevtoolsConnectionState;
  /**
   * Similar to `parentState`, an opaque handle returned from `createShareStateServer()`
   * may be used to share state from another `DevtoolsConnectionState` instance, possibly
   * residing in another process. This handle should generally be considered a secret.
   *
   * In this case, the application needs to ensure that the lifetime of the top-level state
   * extends beyond the lifetime(s) of the respective dependent state instance(s).
   */
  parentHandle?: string;
  /**
   * Proxy options or an existing proxy Agent instance that can be shared. These are applied to
   * both database cluster traffic and, optionally, OIDC HTTP traffic.
   */
  proxy?: DevtoolsProxyOptions | AgentWithInitialize;
  /**
   * Whether the proxy specified in `.proxy` should be applied to OIDC HTTP traffic as well.
   * This can be an agent or proxy options object, in which case they will override the ones
   * provided in `proxy` for OIDC traffic.
   */
  applyProxyToOIDC?: boolean | DevtoolsProxyOptions | AgentWithInitialize;
}

export type ConnectMongoClientResult = {
  client: MongoClient;
  state: DevtoolsConnectionState;
};

/**
 * Connect a MongoClient. If AutoEncryption is requested, first connect without the encryption options and verify that
 * the connection is to an enterprise cluster. If not, then error, otherwise close the connection and reconnect with the
 * options the user initially specified. Provide the client class as an additional argument in order to test.
 */
export async function connectMongoClient(
  uri: string,
  clientOptions: DevtoolsConnectOptions,
  logger: ConnectLogEmitter,
  MongoClientClass: typeof MongoClient,
): Promise<ConnectMongoClientResult> {
  detectAndLogMissingOptionalDependencies(logger);

  const options = { uri, clientOptions, logger, MongoClientClass };
  // Connect once with the system certificate store added, and if that fails with
  // a TLS error, try again. In theory adding certificates into the certificate store
  // should not cause failures, but in practice we have observed some, hence this
  // double connection establishment logic.
  // We treat TLS errors as fail-fast errors, so in typical situations (even typical
  // failure situations) we do not spend an unreasonable amount of time in the first
  // connection attempt.
  try {
    return await connectMongoClientImpl({ ...options, useSystemCA: true });
  } catch (error: unknown) {
    if (isPotentialTLSCertificateError(error)) {
      logger.emit('devtools-connect:retry-after-tls-error', {
        error: String(error),
      });
      try {
        return await connectMongoClientImpl({ ...options, useSystemCA: false });
      } catch {}
    }
    throw error;
  }
}

async function connectMongoClientImpl({
  uri,
  clientOptions,
  logger,
  MongoClientClass,
  useSystemCA,
}: {
  uri: string;
  clientOptions: DevtoolsConnectOptions;
  logger: ConnectLogEmitter;
  MongoClientClass: typeof MongoClient;
  useSystemCA: boolean;
}): Promise<ConnectMongoClientResult> {
  const cleanupOnClientClose: (() => void | Promise<void>)[] = [];
  const runClose = async () => {
    let item: (() => void | Promise<void>) | undefined;
    while ((item = cleanupOnClientClose.shift())) await item();
  };

  let ca: string | undefined;
  try {
    if (useSystemCA) {
      const {
        ca: caWithSystemCerts,
        asyncFallbackError,
        systemCertsError,
        systemCACount,
        messages,
      } = await systemCA({
        ca: clientOptions.ca,
        tlsCAFile:
          clientOptions.tlsCAFile || getConnectionStringParam(uri, 'tlsCAFile'),
      });
      logger.emit('devtools-connect:used-system-ca', {
        caCount: systemCACount,
        asyncFallbackError,
        systemCertsError,
        messages,
      });
      ca = caWithSystemCerts;
    }

    // Create a proxy agent, if requested. `useOrCreateAgent()` takes a target argument
    // that can be used to select a proxy for a specific procotol or host;
    // here we specify 'mongodb://' if we only intend to use the proxy for database
    // connectivity.
    const proxyAgent =
      clientOptions.proxy &&
      useOrCreateAgent(
        'createConnection' in clientOptions.proxy
          ? clientOptions.proxy
          : {
              ...(clientOptions.proxy as DevtoolsProxyOptions),
              ...(ca ? { ca } : {}),
            },
        clientOptions.applyProxyToOIDC === true ? undefined : 'mongodb://',
      );
    cleanupOnClientClose.push(() => proxyAgent?.destroy());

    let oidcProxyOptions:
      | AgentWithInitialize
      | DevtoolsProxyOptions
      | undefined;
    if (clientOptions.applyProxyToOIDC === true) {
      oidcProxyOptions = proxyAgent;
    } else if (clientOptions.applyProxyToOIDC) {
      oidcProxyOptions = clientOptions.applyProxyToOIDC;
    }
    if (!oidcProxyOptions && ca) {
      oidcProxyOptions = { ca };
    }
    if (oidcProxyOptions) {
      clientOptions.oidc = {
        customFetch: createFetch(
          oidcProxyOptions,
        ) as unknown as MongoDBOIDCPluginOptions['customFetch'],
        ...clientOptions.oidc,
      };
    }

    let tunnel: Tunnel | undefined;
    if (proxyAgent && !hasProxyHostOption(uri, clientOptions)) {
      tunnel = createSocks5Tunnel(
        proxyAgent,
        'generate-credentials',
        'mongodb://',
      );
      cleanupOnClientClose.push(() => tunnel?.close());
    }
    for (const proxyLogger of new Set([tunnel?.logger, proxyAgent?.logger])) {
      if (proxyLogger) {
        copyEventEmitterEvents(proxyLogger, logger);
      }
    }
    if (tunnel) {
      // Should happen after attaching loggers
      await tunnel?.listen();
      clientOptions = {
        ...clientOptions,
        ...tunnel?.config,
      };
    }

    // If PROVIDER_NAME was specified to the MongoClient options, adding callbacks would conflict
    // with that; we should omit them so that e.g. mongosh users can leverage the non-human OIDC
    // auth flows by specifying PROVIDER_NAME.
    const shouldAddOidcCallbacks = isHumanOidcFlow(uri, clientOptions);
    const state =
      clientOptions.parentState ??
      new DevtoolsConnectionState(clientOptions, logger);
    const mongoClientOptions: MongoClientOptions &
      Partial<DevtoolsConnectOptions> = merge(
      { __skipPingOnConnect: true },
      clientOptions,
      shouldAddOidcCallbacks ? state.oidcPlugin.mongoClientOptions : {},
      { allowPartialTrustChain: true },
      ca ? { ca } : {},
    );

    // Adopt dns result order changes with Node v18 that affected the VSCode extension VSCODE-458.
    // Refs https://github.com/microsoft/vscode/issues/189805
    mongoClientOptions.lookup = (hostname, options, callback) => {
      return dns.lookup(hostname, { verbatim: false, ...options }, callback);
    };

    delete (mongoClientOptions as any).useSystemCA; // can be removed once no product uses this anymore
    delete mongoClientOptions.productDocsLink;
    delete mongoClientOptions.productName;
    delete mongoClientOptions.oidc;
    delete mongoClientOptions.parentState;
    delete mongoClientOptions.parentHandle;
    delete mongoClientOptions.proxy;
    delete mongoClientOptions.applyProxyToOIDC;

    if (
      mongoClientOptions.autoEncryption !== undefined &&
      !mongoClientOptions.autoEncryption.bypassAutoEncryption &&
      !mongoClientOptions.autoEncryption.bypassQueryAnalysis
    ) {
      // connect first without autoEncryption and serverApi options.
      const optionsWithoutFLE = { ...mongoClientOptions };
      delete optionsWithoutFLE.autoEncryption;
      delete optionsWithoutFLE.serverApi;
      const client = new MongoClientClass(uri, optionsWithoutFLE);
      closeMongoClientWhenAuthFails(state, client);
      await connectWithFailFast(uri, client, logger);
      const buildInfo = await client
        .db('admin')
        .admin()
        .command({ buildInfo: 1 });
      await client.close();
      if (
        !buildInfo.modules?.includes('enterprise') &&
        !buildInfo.gitVersion?.match(/enterprise/)
      ) {
        throw new MongoAutoencryptionUnavailable();
      }
    }
    uri = await resolveMongodbSrv(uri, logger);
    const client = new MongoClientClass(uri, mongoClientOptions);
    client.once('close', runClose);
    closeMongoClientWhenAuthFails(state, client);
    await connectWithFailFast(uri, client, logger);
    if ((client as any).autoEncrypter) {
      // Enable Devtools-specific CSFLE result decoration.
      (client as any).autoEncrypter[
        Symbol.for('@@mdb.decorateDecryptionResult')
      ] = true;
    }
    return { client, state };
  } catch (err: unknown) {
    await runClose();
    throw err;
  }
}

function getMaybeConectionString(uri: string): ConnectionString | null {
  try {
    return new ConnectionString(uri, { looseValidation: true });
  } catch {
    return null;
  }
}

function getConnectionStringParam<K extends keyof MongoClientOptions>(
  uri: string,
  key: K,
): string | null {
  return (
    getMaybeConectionString(uri)
      ?.typedSearchParams<MongoClientOptions>()
      .get(key) ?? null
  );
}

function hasProxyHostOption(
  uri: string,
  clientOptions: MongoClientOptions,
): boolean {
  if (clientOptions.proxyHost || clientOptions.proxyPort) return true;
  const sp =
    getMaybeConectionString(uri)?.typedSearchParams<MongoClientOptions>();
  return sp?.has('proxyHost') || sp?.has('proxyPort') || false;
}

export function isHumanOidcFlow(
  uri: string,
  clientOptions: MongoClientOptions,
): boolean {
  if (
    (clientOptions.authMechanism &&
      clientOptions.authMechanism !== 'MONGODB-OIDC') ||
    clientOptions.authMechanismProperties?.ENVIRONMENT ||
    clientOptions.authMechanismProperties?.OIDC_CALLBACK
  ) {
    return false;
  }

  const sp =
    getMaybeConectionString(uri)?.typedSearchParams<MongoClientOptions>();
  const authMechanism = clientOptions.authMechanism ?? sp?.get('authMechanism');
  return (
    authMechanism === 'MONGODB-OIDC' &&
    !new CommaAndColonSeparatedRecord(sp?.get('authMechanismProperties')).get(
      'ENVIRONMENT',
    )
  );
}

function closeMongoClientWhenAuthFails(
  state: DevtoolsConnectionState,
  client: MongoClient,
): void {
  // First, make sure that the 'close' event is emitted on the client,
  // see also the comments in https://jira.mongodb.org/browse/NODE-5155.
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const originalClose = client.close;
  client.close = async function (...args) {
    let closeEmitted = false;
    const onClose = () => (closeEmitted = true);
    this.on('close', onClose);
    const result = await originalClose.call(this, ...args);
    this.off('close', onClose);
    if (!closeEmitted) {
      this.emit('close');
    }
    return result;
  };

  // Close the client when the OIDC plugin says that authentication failed
  // (notably, this also happens when that failure comes from another
  // client using the same `state` instance).
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const onOIDCAuthFailed = () => client.close().catch(() => {});
  state.oidcPlugin.logger.once(
    'mongodb-oidc-plugin:auth-failed',
    onOIDCAuthFailed,
  );
  client.once('close', () =>
    state.oidcPlugin.logger.off?.(
      'mongodb-oidc-plugin:auth-failed',
      onOIDCAuthFailed,
    ),
  );
}
