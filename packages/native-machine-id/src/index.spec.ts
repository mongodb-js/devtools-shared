/* eslint-disable no-console */
import type { GetMachineIdOptions } from '.';
import { getMachineId as getMachineIdAsync, getMachineIdSync } from '.';
import {
  machineIdSync as otherMachineIdSync,
  machineId as otherMachineIdAsync,
} from 'node-machine-id';
import chai, { expect } from 'chai';
import { createHash } from 'crypto';
import sinonChai from 'sinon-chai';
import sinon from 'sinon';
import bindings from 'bindings';
import assert from 'assert';

chai.use(sinonChai);

type MachineIdFunctionPair = [
  typeof getMachineIdAsync | typeof getMachineIdSync,
  typeof otherMachineIdSync | typeof otherMachineIdAsync,
];

describe('native-machine-id', function () {
  this.timeout(5_000);

  (<MachineIdFunctionPair[]>[
    [getMachineIdAsync, otherMachineIdAsync],
    [getMachineIdSync, otherMachineIdSync],
  ]).forEach(([machineIdFn, otherMachineIdFn]) => {
    const isAsync = machineIdFn === getMachineIdAsync;
    const functionName = isAsync ? 'getMachineId' : 'getMachineIdSync';

    describe(functionName, function () {
      async function getMachineId({
        raw = false,
      }: GetMachineIdOptions = {}): Promise<string> {
        const result = machineIdFn({ raw });
        const deviceId = isAsync ? await result : result;
        assert(typeof deviceId === 'string');
        return deviceId;
      }

      async function otherMachineId({
        raw = false,
      }: Pick<GetMachineIdOptions, 'raw'> = {}): Promise<string> {
        const result = otherMachineIdFn(raw);
        const deviceId = isAsync ? await result : result;
        assert(typeof deviceId === 'string');
        return deviceId;
      }

      describe('without hashing', function () {
        let id: string;
        beforeEach(async function () {
          id = await getMachineId({ raw: true });
        });

        it('returns a valid UUID format machine ID', function () {
          // UUID format: 8-4-4-4-12 hex digits
          const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

          expect(uuidRegex.test(id));
        });

        it('is consistent with node-machine-id', async function () {
          const otherId = await otherMachineId({ raw: true });

          // node-machine-id returns a lowercase ID
          expect(id.toLowerCase()).to.equal(otherId);
        });

        it('can reproduce the hashed node-machine-id value', async function () {
          const otherHashedId = await otherMachineId();

          // Compare the lowercase workaround for consistency with node-machine-id
          const hashedId = createHash('sha256')
            .update(id.toLowerCase())
            .digest('hex');

          expect(hashedId).to.equal(otherHashedId);
        });
      });

      describe('with hashing', function () {
        let id: string;

        beforeEach(async function () {
          id = await getMachineId();
        });

        it('returns a valid SHA256 hash format machine ID', async function () {
          // SHA256 hash format: 64 hex digits
          const hashRegex = /^[0-9a-f]{64}$/i;

          expect(hashRegex.test(id));

          // Get the raw ID to verify hashing is working correctly
          const rawId = await getMachineId({ raw: true });

          expect(id).equals(createHash('sha256').update(rawId).digest('hex'));
        });
      });
    });
  });

  describe('edge cases', function () {
    afterEach(function () {
      sinon.restore();
    });

    describe('getMachineIdSync', function () {
      describe('returns undefined', function () {
        it('if something goes wrong with the binding function', function () {
          sinon
            .stub(bindings('machine_id'), 'getMachineIdSync')
            .throws(new Error('Binding error'));

          expect(getMachineIdSync({ raw: true })).to.be.undefined;
          expect(getMachineIdSync()).to.be.undefined;
        });

        it('if the binding function returns an empty string', function () {
          sinon.stub(bindings('machine_id'), 'getMachineIdSync').returns('');

          expect(getMachineIdSync({ raw: true })).to.be.undefined;
          expect(getMachineIdSync()).to.be.undefined;
        });

        it('if the binding function returns undefined', function () {
          sinon
            .stub(bindings('machine_id'), 'getMachineIdSync')
            .returns(undefined);

          expect(getMachineIdSync({ raw: true })).to.be.undefined;
          expect(getMachineIdSync()).to.be.undefined;
        });
      });
    });

    describe('getMachineId', function () {
      describe('returns undefined', function () {
        let response: sinon.SinonStub<
          [],
          { error: Error | null; value?: string }
        >;

        beforeEach(function () {
          response = sinon.stub();
          sinon.replace(
            bindings('machine_id'),
            'getMachineIdAsync',
            (callback) => {
              const { error, value } = response();
              callback(error, value);
            },
          );
        });

        it('if something goes wrong with the binding function', async function () {
          response.returns({ error: null, value: 'not this' });
          sinon
            .stub(bindings('machine_id'), 'getMachineIdAsync')
            .throws(new Error('Binding error'));

          expect(await getMachineIdAsync({ raw: true })).to.be.undefined;
          expect(await getMachineIdAsync()).to.be.undefined;
        });

        it('if the callback resolves with an error', async function () {
          response.returns({ error: new Error('Binding error') });

          expect(await getMachineIdAsync({ raw: true })).to.be.undefined;
          expect(await getMachineIdAsync()).to.be.undefined;
        });

        it('if the callback resolves with an empty string', async function () {
          response.returns({ error: null, value: '' });

          expect(await getMachineIdAsync({ raw: true })).to.be.undefined;
          expect(await getMachineIdAsync()).to.be.undefined;
        });

        it('if the callback resolves with undefined', async function () {
          response.returns({ error: null, value: undefined });

          expect(await getMachineIdAsync({ raw: true })).to.be.undefined;
          expect(await getMachineIdAsync()).to.be.undefined;
        });
      });
    });
  });

  describe('consistency between sync and async', function () {
    it('returns the same raw ID when using sync and async methods', async function () {
      const syncId = getMachineIdSync({ raw: true });
      const asyncId = await getMachineIdAsync({ raw: true });

      expect(syncId).to.equal(asyncId);
    });

    it('returns the same hashed ID when using sync and async methods', async function () {
      const syncId = getMachineIdSync();
      const asyncId = await getMachineIdAsync();

      expect(syncId).to.equal(asyncId);
    });
  });
});
