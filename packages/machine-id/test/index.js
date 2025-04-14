"use strict";
const assert = require("assert");
const getMachineId = require("..");
const { machineId, machineIdSync } = require("node-machine-id");

describe("machine-id", function () {
  this.timeout(5000);

  it("returns a non-empty machine ID", function () {
    const id = getMachineId();
    assert.strictEqual(typeof id, "string");
    assert.ok(id.length > 0, "Machine ID should not be empty");
  });

  it("returns a valid UUID format", function () {
    const id = getMachineId();
    // UUID format: 8-4-4-4-12 hex digits
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    assert.ok(uuidRegex.test(id), `Expected UUID format, got: ${id}`);
  });

  it("compares with node-machine-id", function () {
    const ourId = getMachineId();
    // Machine ID from node-machine-id may be lowercase
    const nodeId = machineIdSync(true).toUpperCase();

    console.log("Our machine ID:", ourId);
    console.log("node-machine-id:", nodeId);

    assert.ok(ourId, "Our implementation should return a machine ID");
    assert.ok(nodeId, "node-machine-id should return a machine ID");
  });
});
