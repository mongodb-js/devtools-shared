import ConnectionStringUrl, {
  CommaAndColonSeparatedRecord,
} from 'mongodb-connection-string-url';
import type { MongoClientOptions, AuthMechanismProperties } from 'mongodb';
import { isLocalhost } from 'mongodb-build-info';

const allowedConnectionStringOptions = [
  'appName',
  'authMechanism',
  'authMechanismProperties', // Partially. See allowed and disallowed AuthMechanismProperties below.
  'authSource',
  'autoSelectFamily',
  'autoSelectFamilyAttemptTimeout',
  'bsonRegExp',
  'cert',
  'checkKeys',
  'compressors',
  'connectTimeoutMS',
  'directConnection',
  'driverInfo',
  'enableOverloadRetargeting',
  'enableUtf8Validation',
  'family',
  'fieldsAsRaw',
  'forceServerObjectId',
  'heartbeatFrequencyMS',
  'hints',
  'ignoreUndefined',
  'journal',
  'key',
  'loadBalanced',
  'localAddress',
  'localPort',
  'localThresholdMS',
  'maxAdaptiveRetries',
  'maxConnecting',
  'maxIdleTimeMS',
  'maxPoolSize',
  'maxStalenessSeconds',
  'minHeartbeatFrequencyMS',
  'minPoolSize',
  'monitorCommands',
  'noDelay',
  'passphrase',
  'pfx',
  'promoteBuffers',
  'promoteLongs',
  'promoteValues',
  'proxyPassword',
  'proxyUsername',
  'readConcern',
  'readConcernLevel',
  'readPreference',
  'readPreferenceTags',
  'replicaSet',
  'retryReads',
  'retryWrites',
  'runtimeAdapters',
  'serverApi',
  'serverMonitoringMode',
  'serverSelectionTimeoutMS',
  'socketTimeoutMS',
  'srvMaxHosts',
  'srvServiceName',
  'ssl', // Only if value is `true` or target host is local.
  'timeoutMS',
  'tls', // Only if value is `true` or target host is local.
  'tlsCertificateKeyFile',
  'tlsCertificateKeyFilePassword',
  'tlsCRLFile',
  'useBigInt64',
  'w',
  'waitQueueTimeoutMS',
  'writeConcern',
  'wtimeoutMS',
  'zlibCompressionLevel',
] as const;

const disallowedConnectionStringOptions = [
  'allowPartialTrustChain',
  'ALPNProtocols',
  'auth',
  'autoEncryption',
  'ca',
  'checkServerIdentity',
  'ciphers',
  'crl',
  'ecdhCurve',
  'keepAliveInitialDelay',
  'lookup',
  'minDHSize',
  'mongodbLogComponentSeverities',
  'mongodbLogMaxDocumentLength',
  'mongodbLogPath',
  'pkFactory',
  'proxyHost',
  'proxyPort',
  'raw',
  'rejectUnauthorized',
  'secureContext',
  'secureProtocol',
  'serializeFunctions',
  'servername',
  'session',
  'tlsAllowInvalidCertificates',
  'tlsAllowInvalidHostnames',
  'tlsCAFile',
  'tlsInsecure',
] as const;

const allowedAuthMechanismProperties = [
  'CANONICALIZE_HOST_NAME',
  'TOKEN_RESOURCE',
  'AWS_CREDENTIAL_PROVIDER',
] as const;

// AWS_SESSION_TOKEN is not supported by the driver anymore, but devtools-shared provides
// it as a compatibility mechanism with pre-7.x driver behavior. It is kept in a separate
// list because it is no longer part of `AuthMechanismProperties` and therefore cannot take
// part in the exhaustiveness check below.
const additionalAllowedAuthMechanismProperties = ['AWS_SESSION_TOKEN'] as const;

const disallowedAuthMechanismProperties = [
  'ENVIRONMENT',
  'SERVICE_HOST',
  'SERVICE_NAME',
  'SERVICE_REALM',
  'ALLOWED_HOSTS',
  'OIDC_CALLBACK',
  'OIDC_HUMAN_CALLBACK',
] as const;

// Ensure that all connection string options known to the Node.js driver
// appear either in the allowed or the disallowed ConnectionStringOptions list.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function checkAllowedPlusDisallowedEqualsOptionsKeys(
  input1:
    | (typeof allowedConnectionStringOptions)[number]
    | (typeof disallowedConnectionStringOptions)[number],
  input2: keyof MongoClientOptions,
): [
  keyof MongoClientOptions,
  (
    | (typeof allowedConnectionStringOptions)[number]
    | (typeof disallowedConnectionStringOptions)[number]
  ),
] {
  return [input1, input2];
}

type ExactAuthMechanismProperties = {
  [K in keyof AuthMechanismProperties as string extends K
    ? never
    : K]: AuthMechanismProperties[K];
};

// Ensure that all auth mechanism properties known to the Node.js driver
// appear either in the allowed or the disallowed AuthMechanismProperties list.
// TODO: remove ExactAuthMechanismProperties when https://jira.mongodb.org/browse/NODE-4100 is done.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function checkAllowedPlusDisallowedEqualsAuthMechanismKeys(
  input1:
    | (typeof allowedAuthMechanismProperties)[number]
    | (typeof disallowedAuthMechanismProperties)[number],
  input2: keyof ExactAuthMechanismProperties,
): [
  keyof ExactAuthMechanismProperties,
  (
    | (typeof allowedAuthMechanismProperties)[number]
    | (typeof disallowedAuthMechanismProperties)[number]
  ),
] {
  return [input1, input2];
}

// Ensure that no option or property is listed as both allowed and disallowed, since
// only the allow list is consulted at runtime.
type AssertNever<T extends never> = T;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type NoConnectionStringOptionOverlap = AssertNever<
  Extract<
    (typeof allowedConnectionStringOptions)[number],
    (typeof disallowedConnectionStringOptions)[number]
  >
>;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type NoAuthMechanismPropertyOverlap = AssertNever<
  Extract<
    | (typeof allowedAuthMechanismProperties)[number]
    | (typeof additionalAllowedAuthMechanismProperties)[number],
    (typeof disallowedAuthMechanismProperties)[number]
  >
>;

/** The result of checking a connection string against the policy. */
export interface ConnectionStringPolicyResult {
  withinPolicy: boolean;

  /** Unparseable connection strings are never within policy. */
  unparseable: boolean;

  /**
   * Option names, never values, so that this can be displayed or logged without
   * redacting it first. `'ssl/tls'` is used for connections that would not be
   * TLS-protected.
   */
  flaggedOptions: string[];
}

/**
 * Check a connection string against the policy list, and report the options that fall
 * outside it.
 *
 * This is *not* a general-purpose connection string validator: it makes no claim about
 * whether a connection string is valid or whether connecting will succeed.
 */
export function checkConnectionStringPolicy(
  connectionString: string,
): ConnectionStringPolicyResult {
  let connectionStringUrl: ConnectionStringUrl;
  try {
    connectionStringUrl = new ConnectionStringUrl(connectionString, {
      looseValidation: false,
    });
  } catch {
    return {
      withinPolicy: false,
      unparseable: true,
      flaggedOptions: [],
    };
  }

  const searchParams =
    connectionStringUrl.typedSearchParams<MongoClientOptions>();
  const flaggedOptions: string[] = [];

  const hasNonLocalhostTarget = connectionStringUrl.hosts.some(
    (host) => !isLocalhost(host),
  );
  const wouldNotUseTls = connectionStringUrl.isSRV
    ? searchParams.get('ssl') === 'false' || searchParams.get('tls') === 'false'
    : !(
        searchParams.get('ssl') === 'true' || searchParams.get('tls') === 'true'
      );

  if (hasNonLocalhostTarget && wouldNotUseTls) {
    flaggedOptions.push('ssl/tls');
  }

  for (const [name, value] of searchParams) {
    // Checking the allow list is enough: the type-level checks above guarantee that
    // every option is categorised, and options the driver does not know about yet
    // should be flagged too.
    if (!(allowedConnectionStringOptions as readonly string[]).includes(name)) {
      flaggedOptions.push(name);
    }

    if (name === 'authMechanismProperties') {
      const authMechanismProperties =
        new CommaAndColonSeparatedRecord<AuthMechanismProperties>(value);
      for (const [authMechanismPropName] of authMechanismProperties) {
        if (
          !(allowedAuthMechanismProperties as readonly string[]).includes(
            authMechanismPropName,
          ) &&
          !(
            additionalAllowedAuthMechanismProperties as readonly string[]
          ).includes(authMechanismPropName)
        ) {
          flaggedOptions.push(
            `authMechanismProperties.${authMechanismPropName}`,
          );
        }
      }
    }
  }

  const uniqueFlaggedOptions = [...new Set(flaggedOptions)];

  return {
    withinPolicy: uniqueFlaggedOptions.length === 0,
    unparseable: false,
    flaggedOptions: uniqueFlaggedOptions,
  };
}
