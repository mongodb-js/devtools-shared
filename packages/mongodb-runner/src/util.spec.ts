import { expect } from 'chai';
import { allocatePorts } from './util';
import { isBindable } from '../test/helpers';

describe('util', function () {
  describe('allocatePorts', function () {
    // Roughly the number of host ports an SLS multi-cell compose file exposes.
    const dscPortCount = 24;

    it('returns the requested number of distinct ports', async function () {
      const allocation = await allocatePorts(dscPortCount);
      try {
        expect(allocation.ports).to.have.lengthOf(dscPortCount);
        expect(new Set(allocation.ports).size).to.equal(
          dscPortCount,
          'all allocated ports should be distinct',
        );
      } finally {
        await allocation.release();
      }
    });

    it('holds every port until release() is called', async function () {
      const allocation = await allocatePorts(dscPortCount);
      for (const port of allocation.ports) {
        expect(await isBindable(port), `port ${port} should be held`).to.equal(
          false,
        );
      }
      await allocation.release();
      for (const port of allocation.ports) {
        expect(
          await isBindable(port),
          `port ${port} should be free after release`,
        ).to.equal(true);
      }
    });

    it('never returns duplicates within a batch across many runs', async function () {
      for (let i = 0; i < 20; i++) {
        const allocation = await allocatePorts(dscPortCount);
        try {
          expect(new Set(allocation.ports).size).to.equal(
            dscPortCount,
            `batch ${i} should not contain duplicate ports`,
          );
        } finally {
          await allocation.release();
        }
      }
    });

    it('reserves ports until released', async function () {
      const held = await allocatePorts(1);
      const [heldPort] = held.ports;
      const other = await allocatePorts(1);
      try {
        expect(other.ports[0]).to.not.equal(
          heldPort,
          'a port held by an allocation should not be handed out again',
        );
      } finally {
        await other.release();
        await held.release();
      }
    });
  });
});
