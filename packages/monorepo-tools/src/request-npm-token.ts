#! /usr/bin/env node
/* eslint-disable no-console */

/**
 * CLI command to get NPM token requirements for the current monorepo.
 *
 * Usage:
 *   npm run request-npm-token
 *
 * This will output the scopes and packages that need to be included in NPM token permissions.
 */

import { getNpmTokenList } from './utils/get-npm-token-list';

async function main() {
  try {
    const { scopes, packages } = await getNpmTokenList();

    console.log(
      'Open an IAMSEC ticket with https://jira.mongodb.org/plugins/servlet/desk/portal/81/create/1380',
    );

    console.log('Use the following description for the ticket:');
    console.log('--------------------------------');
    console.log('Hello,');
    console.log(
      'We need to update the NPM token for publishing our packages. The token needs Read/Write/Publish access to:\n',
    );

    console.log('Following Scopes:');
    if (scopes.length > 0) {
      scopes.forEach((scope) => {
        console.log(scope);
      });
    } else {
      console.log('(none)');
    }

    console.log('\nFollowing Packages:');
    if (packages.length > 0) {
      packages.forEach((pkg) => {
        console.log(pkg);
      });
    } else {
      console.log('(none)');
    }

    console.log('');
    console.log('Please share it with our team lead: {TEAM LEADER NAME}');
  } catch (error) {
    console.error(
      'Error:',
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}

process.on('unhandledRejection', (err: Error) => {
  console.error();
  console.error(err?.stack || err?.message || err);
  process.exitCode = 1;
});

main().catch((err) =>
  process.nextTick(() => {
    throw err;
  }),
);
