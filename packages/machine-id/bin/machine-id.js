#!/usr/bin/env node
const getMachineID = require('..');
// eslint-disable-next-line no-console
console.log(getMachineID() || 'Machine ID not available on this platform');
