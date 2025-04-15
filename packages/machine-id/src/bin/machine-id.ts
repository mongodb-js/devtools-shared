#!/usr/bin/env node
import { getMachineId } from '..';

const id = getMachineId({ raw: process.argv.includes('--raw') }) || '';

// eslint-disable-next-line no-console
console.log(id);
