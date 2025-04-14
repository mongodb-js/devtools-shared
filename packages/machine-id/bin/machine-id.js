#!/usr/bin/env node
const getMachineID = require("..");
console.log(getMachineID() || "Machine ID not available on this platform");
