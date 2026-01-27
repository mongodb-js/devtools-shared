import {
  CommaAndColonSeparatedRecord,
  ConnectionString,
} from 'mongodb-connection-string-url';
import type {
  AuthMechanismProperties,
  AWSCredentials,
  MongoClientOptions,
} from 'mongodb';

// The 7.x driver supports AWS authentication via callback-based providers,
// and removed support for credentials passed through the connection string
// (NODE-7046).
// We add the support back here via a custom callback-based provider when
// we detect that the user is trying to use MONGODB-AWS auth with credentials
// in the connection string.
export function transformAWSAuthMechanismOptions<T extends MongoClientOptions>({
  uri,
  clientOptions,
}: {
  uri: string;
  clientOptions: T;
}): { uri: string; clientOptions: T } {
  let connectionString: ConnectionString;
  try {
    connectionString = new ConnectionString(uri);
  } catch {
    return { uri, clientOptions };
  }
  const searchParams = connectionString.typedSearchParams<MongoClientOptions>();
  if (
    (clientOptions.authMechanism ?? searchParams.get('authMechanism')) !==
    'MONGODB-AWS'
  ) {
    return { uri, clientOptions };
  }
  const username =
    clientOptions.auth?.username ??
    decodeURIComponent(connectionString.username);
  const password =
    clientOptions.auth?.password ??
    decodeURIComponent(connectionString.password);
  const authMechProps = new CommaAndColonSeparatedRecord(
    searchParams.get('authMechanismProperties') ?? '',
  );
  const sessionToken =
    clientOptions.authMechanismProperties?.AWS_SESSION_TOKEN ??
    authMechProps.get('AWS_SESSION_TOKEN');
  if (username || password || sessionToken) {
    // First, remove all relevant options from the connection string
    connectionString.username = '';
    connectionString.password = '';
    authMechProps.delete('AWS_SESSION_TOKEN');
    if (authMechProps.size === 0) {
      searchParams.delete('authMechanismProperties');
    } else {
      searchParams.set('authMechanismProperties', authMechProps.toString());
    }
    // Set AWS_CREDENTIAL_PROVIDER in the programmatic options,
    // and unset all other credential options.
    const programmaticAuthMechProps: AuthMechanismProperties & {
      AWS_SESSION_TOKEN?: unknown;
    } = { ...clientOptions.authMechanismProperties };
    delete programmaticAuthMechProps.AWS_SESSION_TOKEN;
    programmaticAuthMechProps.AWS_CREDENTIAL_PROVIDER ??=
      (): Promise<AWSCredentials> => {
        const creds: AWSCredentials = {
          accessKeyId: username,
          secretAccessKey: password,
          sessionToken: sessionToken || undefined,
        };
        return Promise.resolve(creds);
      };
    clientOptions = {
      ...clientOptions,
      auth: undefined,
      authMechanismProperties: programmaticAuthMechProps,
    };
  }
  return { uri: connectionString.toString(), clientOptions };
}
