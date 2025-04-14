/* eslint-disable no-console */
import { getMachineId } from '.';
import { machineIdSync as otherMachineId } from 'node-machine-id';
import chai, { expect } from 'chai';
import { createHash } from 'crypto';
import sinonChai from 'sinon-chai';
import sinon from 'sinon';
import bindings from 'bindings';

chai.use(sinonChai);

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

      expect(id).equals(
        createHash('sha256')
          .update(getMachineId({ raw: true }) || '')
          .digest('hex'),
      );
    });
  });

  describe('edge cases', function () {
    afterEach(function () {
      sinon.restore();
    });

    describe('returns undefined', function () {
      it('if something goes wrong with the binding function', function () {
        sinon
          .stub(bindings('machine_id'), 'getMachineId')
          .throws(new Error('Binding error'));

        expect(getMachineId({ raw: true })).to.be.undefined;
        expect(getMachineId()).to.be.undefined;
      });

      it('if the binding function returns an empty string', function () {
        sinon.stub(bindings('machine_id'), 'getMachineId').returns('');

        expect(getMachineId({ raw: true })).to.be.undefined;
        expect(getMachineId()).to.be.undefined;
      });

      it('if the binding function returns undefined', function () {
        sinon.stub(bindings('machine_id'), 'getMachineId').returns(undefined);

        expect(getMachineId({ raw: true })).to.be.undefined;
        expect(getMachineId()).to.be.undefined;
      });
    });
  });
});
