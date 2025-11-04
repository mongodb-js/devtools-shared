#!/usr/bin/env node
/* eslint-disable no-console */
'use strict';

import { OIDCMockProvider } from '.';
import { parseCLIArgs } from './cli-parser';

(async function main() {
  const oidcMockProviderConfig = parseCLIArgs(undefined, 28200);
  const mockIdentityProvider = await OIDCMockProvider.create(
    oidcMockProviderConfig,
  );

  console.log(
    `Started OIDC mock identity provider server. Listening on ${String(oidcMockProviderConfig.hostname)}:${String(oidcMockProviderConfig.port)}.`,
  );
  console.log(
    'OIDC mock identity provider server issuer:',
    mockIdentityProvider.issuer,
  );
})().catch((err) => {
  console.error('Error starting OIDC mock identity provider server:', err);
  process.exitCode = 1;
});
