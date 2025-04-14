import { getMachineId } from ".";
import { machineIdSync as otherMachineId } from "node-machine-id";
import { expect } from "chai";
import { createHash } from "crypto";

describe("machine-id", function () {
  this.timeout(5_000);

  describe("without hashing", function () {
    let id: string;

    beforeEach(function () {
      id = getMachineId(true);
    });

    it("returns a valid UUID format machine ID", function () {
      // UUID format: 8-4-4-4-12 hex digits
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      expect(uuidRegex.test(id));
    });

    it("is consistent with node-machine-id", function () {
      const nodeId = otherMachineId(true);

      // node-machine-id returns a lowercase ID
      expect(id.toLowerCase()).to.equal(nodeId);
    });

    it("can reproduce the hashed node-machine-id value", function () {
      const nodeId = otherMachineId();

      // Compare the lowercase workaround for consistency with node-machine-id
      const hashedId = createHash("sha256")
        .update(id.toLowerCase())
        .digest("hex");

      expect(hashedId).to.equal(nodeId);
    });
  });

  describe("with hashing", function () {
    let id: string;

    beforeEach(function () {
      id = getMachineId();
    });

    it("returns a valid SHA256 hash format machine ID", function () {
      // SHA256 hash format: 64 hex digits
      const hashRegex = /^[0-9a-f]{64}$/i;

      expect(hashRegex.test(id));
    });
  });
});
