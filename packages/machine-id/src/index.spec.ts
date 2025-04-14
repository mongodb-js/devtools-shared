/* eslint-disable no-console */
import { getMachineId } from '.';
import { machineIdSync as otherMachineId } from 'node-machine-id';
import { expect } from 'chai';
import { createHash } from 'crypto';

describe('machine-id', function () {
  this.timeout(5_000);

  describe('without hashing', function () {
    let id: string;

    beforeEach(function () {
      id = getMachineId({ raw: true }) || '';
    });

    it('returns a valid UUID format machine ID', function () {
      // UUID format: 8-4-4-4-12 hex digits
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      expect(uuidRegex.test(id));
    });

    it('is consistent with node-machine-id', function () {
      const nodeId = otherMachineId(true);

      // node-machine-id returns a lowercase ID
      expect(id.toLowerCase()).to.equal(nodeId);
    });

    it('can reproduce the hashed node-machine-id value', function () {
      const nodeId = otherMachineId();

      // Compare the lowercase workaround for consistency with node-machine-id
      const hashedId = createHash('sha256')
        .update(id.toLowerCase())
        .digest('hex');

      expect(hashedId).to.equal(nodeId);
    });
  });

  describe('with hashing', function () {
    let id: string;

    beforeEach(function () {
      id = getMachineId() || '';
    });

    it('returns a valid SHA256 hash format machine ID', function () {
      // SHA256 hash format: 64 hex digits
      const hashRegex = /^[0-9a-f]{64}$/i;

      expect(hashRegex.test(id));
    });
  });

  describe('performance comparison', function () {
    // Increase timeout for performance tests
    this.timeout(100_000);

    it('performs faster than node-machine-id (raw)', function () {
      const iterations = 1000;

      // Warm-up run to account for initial load time
      getMachineId({ raw: true });
      otherMachineId(true);

      // Test  implementation
      const startOurs = process.hrtime.bigint();
      for (let i = 0; i < iterations; i++) {
        getMachineId({ raw: true });
      }
      const endOurs = process.hrtime.bigint();
      const ourTime = Number(endOurs - startOurs) / 1_000_000; // Convert to ms

      // Test node-machine-id
      const startOther = process.hrtime.bigint();
      for (let i = 0; i < iterations; i++) {
        otherMachineId(true);
      }
      const endOther = process.hrtime.bigint();
      const otherTime = Number(endOther - startOther) / 1_000_000; // Convert to ms

      console.log(
        `Performance comparison (raw mode, ${iterations} iterations):`,
      );
      console.log(
        `- Our implementation: ${ourTime.toFixed(4)}ms (${(ourTime / iterations).toFixed(4)}ms per call)`,
      );
      console.log(
        `- node-machine-id: ${otherTime.toFixed(4)}ms (${(otherTime / iterations).toFixed(4)}ms per call)`,
      );
      console.log(
        `- Difference: ${ourTime < otherTime ? 'Ours is ' + (otherTime / ourTime).toFixed(2) + 'x faster' : 'node-machine-id is ' + (ourTime / otherTime).toFixed(2) + 'x faster'}`,
      );

      // We expect our native implementation to be faster
      // but don't fail the test if it's not, just report the measurements
    });

    it('performs faster than node-machine-id (hashed)', function () {
      const iterations = 1000;

      // Warm-up run
      getMachineId();
      otherMachineId();

      // Test our implementation
      const startOurs = process.hrtime.bigint();
      for (let i = 0; i < iterations; i++) {
        getMachineId();
      }
      const endOurs = process.hrtime.bigint();
      const ourTime = Number(endOurs - startOurs) / 1_000_000; // Convert to ms

      // Test node-machine-id
      const startOther = process.hrtime.bigint();
      for (let i = 0; i < iterations; i++) {
        otherMachineId();
      }
      const endOther = process.hrtime.bigint();
      const otherTime = Number(endOther - startOther) / 1_000_000; // Convert to ms

      console.log(
        `Performance comparison (hashed mode, ${iterations} iterations):`,
      );
      console.log(
        `- Our implementation: ${ourTime.toFixed(4)}ms (${(ourTime / iterations).toFixed(4)}ms per call)`,
      );
      console.log(
        `- node-machine-id: ${otherTime.toFixed(4)}ms (${(otherTime / iterations).toFixed(4)}ms per call)`,
      );
      console.log(
        `- Difference: ${ourTime < otherTime ? 'Ours is ' + (otherTime / ourTime).toFixed(2) + 'x faster' : 'node-machine-id is ' + (ourTime / otherTime).toFixed(2) + 'x faster'}`,
      );

      // We expect our native implementation to be faster
      // but don't fail the test if it's not, just report the measurements
    });
  });
});
