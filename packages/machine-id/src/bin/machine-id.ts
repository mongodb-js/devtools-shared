#!/usr/bin/env node
import { getMachineId } from '..';

// Check if --raw flag is provided
const rawFlag = process.argv.includes('--raw');

// Get the machine ID, passing the raw option if requested
const id =
  getMachineId({ raw: rawFlag }) || 'Machine ID not available on this platform';

// eslint-disable-next-line no-console
console.log(id);
