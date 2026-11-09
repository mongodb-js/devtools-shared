#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './index';

async function main(): Promise<void> {
  const server = createServer();
  await server.connect(new StdioServerTransport());
}

main().catch((err) => {
  // stdout carries the MCP protocol, so diagnostics must go to stderr.
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
