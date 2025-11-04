import yargs from 'yargs';
import type { OIDCMockProviderConfig } from '.';

const DEFAULT_TOKEN_PAYLOAD = JSON.stringify({
  groups: ['testgroup'],
  sub: 'testuser',
  aud: 'resource-server-audience-value',
});

export function parseCLIArgs(
  args?: undefined | string | string[],
  defaultPort?: number,
): OIDCMockProviderConfig {
  const yargsParser = yargs
    .option('port', {
      alias: 'p',
      type: 'string',
      desc: 'Port to run the server on. Setting to 0 auto-assigns to a random port.',
      default: defaultPort ?? 0,
    })
    .option('host', {
      alias: 'h',
      type: 'string',
      desc: 'Hostname for the server to listen upon. Defaults to localhost.',
      default: 'localhost',
    })
    .option('bind_ip_all', {
      type: 'boolean',
      desc: 'Bind to all IPv4 and IPv6 addresses',
      default: false,
    })
    .option('payload', {
      alias: 'P',
      type: 'string',
      desc: 'JSON payload to be returned to the client.',
      default: DEFAULT_TOKEN_PAYLOAD,
    })
    .option('expiry', {
      alias: 'e',
      type: 'number',
      desc: 'Expiry time for the token in seconds.',
      default: 3600,
    })
    .option('id-payload', {
      alias: 'i',
      type: 'string',
      desc: 'Custom JSON payload for ID tokens.',
    })
    .option('skip-id-token', {
      type: 'boolean',
      desc: 'Skip issuing ID tokens.',
    })
    .option('skip-refresh-token', {
      type: 'boolean',
      desc: 'Skip issuing ID tokens.',
    })
    .option('log-requests', {
      alias: 'l',
      type: 'boolean',
      desc: 'Log all incoming HTTP requests to the console.',
      default: true,
    })
    .option('issuer-metadata', {
      alias: 'I',
      type: 'string',
      desc: 'Additional issuer metadata as JSON to include in the OIDC discovery document.',
      default: '{}',
    })
    .example(
      '$0 -p 28200',
      'Start the OIDC mock identity provider server on port 28200',
    )
    .help();
  const argv = args ? yargsParser.parseSync(args) : yargsParser.parseSync();

  return {
    getTokenPayload() {
      return {
        expires_in: argv.expiry,
        payload: JSON.parse(argv.payload),
        skipIdToken: argv.skipIdToken,
        customIdTokenPayload: argv.idPayload
          ? JSON.parse(argv.idPayload)
          : undefined,
        skipRefreshToken: argv.skipRefreshToken,
      };
    },
    port: +argv.port,
    hostname: argv.host,
    bindIpAll: argv.bind_ip_all,
    overrideRequestHandler: argv.logRequests
      ? undefined
      : (url, req) => {
          // eslint-disable-next-line no-console
          console.log(`${String(req.method)} ${url}`);
        },
    additionalIssuerMetadata() {
      return JSON.parse(argv.issuerMetadata);
    },
  };
}
