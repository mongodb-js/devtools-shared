#!/usr/bin/env node
/* eslint-disable no-console */
'use strict';

const { OIDCMockProvider } = require('..');

const DEFAULT_PORT = 28200;
const DEFAULT_HOST = 'localhost';

const argv = require('yargs')
  .option('port', {
    alias: 'p',
    type: 'string',
    desc: 'Port to run the server on. Defaults to 0 (auto-assigns to a random port).',
  })
  .option('host', {
    alias: 'h',
    type: 'string',
    desc: 'Hostname for the server to listen upon. Defaults to localhost.',
  })
  .example(
    '$0 -p 28200',
    'Start the OIDC mock identity provider server on port 28200'
  )
  .help().argv;

const DEFAULT_TOKEN_PAYLOAD = {
  expires_in: 3600,
  payload: {
    // Define the user information stored inside the access tokens.
    groups: ['testgroup'],
    sub: 'testuser',
    aud: 'resource-server-audience-value',
  },
};

(async function main() {
  const oidcMockProviderConfig = {
    getTokenPayload() {
      return DEFAULT_TOKEN_PAYLOAD;
    },
    port: argv.port ?? DEFAULT_PORT,
    hostname: argv.host ?? DEFAULT_HOST,
  };
  const mockIdentityProvider = await OIDCMockProvider.create(
    oidcMockProviderConfig
  );

  console.log(
    `Started OIDC mock identity provider server. Listening on ${oidcMockProviderConfig.hostname}:${oidcMockProviderConfig.port}.`
  );
  console.log(
    'OIDC mock identity provider server issuer:',
    mockIdentityProvider.issuer
  );
})();
