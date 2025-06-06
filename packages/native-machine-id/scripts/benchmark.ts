#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Performance comparison script for machine-id vs node-machine-id
 *
 * This script measures and compares the performance of native-machine-id
 * against the node-machine-id package.
 */

import { getMachineIdSync as getMachineId } from '../dist/index.js';
import { machineIdSync } from 'node-machine-id';

// Configuration
const ITERATIONS = 100;

// Utility to format time
function formatTime(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(2)}µs`;
  }
  return `${ms.toFixed(2)}ms`;
}

// Utility to format comparison
function formatComparison(time1: number, time2: number): string {
  if (time1 < time2) {
    return `${(time2 / time1).toFixed(2)}x faster`;
  } else {
    return `${(time1 / time2).toFixed(2)}x slower`;
  }
}

function runBenchmark() {
  console.log('========================================');
  console.log('Machine ID Performance Benchmark');
  console.log('========================================');
  console.log(`Platform: ${process.platform}`);
  console.log(`Node.js version: ${process.version}`);
  console.log(`Test iterations: ${ITERATIONS}`);
  console.log('----------------------------------------');

  // Test raw mode (no hashing)
  console.log('Raw:');

  const startOursRaw = process.hrtime.bigint();
  for (let i = 0; i < ITERATIONS; i++) {
    getMachineId({ raw: true });
  }
  const endOursRaw = process.hrtime.bigint();
  const ourTimeRaw = Number(endOursRaw - startOursRaw) / 1_000_000; // ms

  // node-machine-id
  const startOtherRaw = process.hrtime.bigint();
  for (let i = 0; i < ITERATIONS; i++) {
    machineIdSync(true);
  }
  const endOtherRaw = process.hrtime.bigint();
  const otherTimeRaw = Number(endOtherRaw - startOtherRaw) / 1_000_000; // ms

  console.log(
    `native-machine-id: ${formatTime(ourTimeRaw)} total, ${formatTime(ourTimeRaw / ITERATIONS)} per call`,
  );
  console.log(
    `node-machine-id:        ${formatTime(otherTimeRaw)} total, ${formatTime(otherTimeRaw / ITERATIONS)} per call`,
  );
  console.log(
    `Comparison: native-machine-id is ${formatComparison(ourTimeRaw, otherTimeRaw)}`,
  );

  console.log('----------------------------------------');

  // Test hashed mode
  console.log('Hashed:');

  // native-machine-id
  const startOursHashed = process.hrtime.bigint();
  for (let i = 0; i < ITERATIONS; i++) {
    getMachineId();
  }
  const endOursHashed = process.hrtime.bigint();
  const ourTimeHashed = Number(endOursHashed - startOursHashed) / 1_000_000; // ms

  // node-machine-id
  const startOtherHashed = process.hrtime.bigint();
  for (let i = 0; i < ITERATIONS; i++) {
    machineIdSync();
  }
  const endOtherHashed = process.hrtime.bigint();
  const otherTimeHashed = Number(endOtherHashed - startOtherHashed) / 1_000_000; // ms

  console.log(
    `native-machine-id: ${formatTime(ourTimeHashed)} total, ${formatTime(ourTimeHashed / ITERATIONS)} per call`,
  );
  console.log(
    `node-machine-id:        ${formatTime(otherTimeHashed)} total, ${formatTime(otherTimeHashed / ITERATIONS)} per call`,
  );
  console.log(
    `Comparison: native-machine-id is ${formatComparison(ourTimeHashed, otherTimeHashed)}`,
  );
}

// Run the benchmark
runBenchmark();
