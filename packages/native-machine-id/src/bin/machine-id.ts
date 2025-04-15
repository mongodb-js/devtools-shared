#!/usr/bin/env node
import { getMachineIdSync } from '..';

const id = getMachineIdSync({ raw: process.argv.includes('--raw') }) || '';

// eslint-disable-next-line no-console
console.log(id);
