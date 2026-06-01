import { expect } from 'chai';
import { MongoServer } from './mongoserver';
import type { MongoClient } from 'mongodb';
import sinon from 'sinon';

describe('MongoServer._ensureMatchingMetadataColl', function () {
  let server: MongoServer;

  beforeEach(function () {
    server = new MongoServer();
  });

  afterEach(function () {
    sinon.restore();
  });

  function makeClient(responses: Array<Record<string, unknown>>): {
    client: MongoClient;
    commandStub: sinon.SinonStub;
  } {
    let callCount = 0;
    const commandStub = sinon
      .stub()
      .callsFake(
        async () => responses[Math.min(callCount++, responses.length - 1)],
      );
    const client = {
      db: sinon.stub().returns({ command: commandStub }),
    } as unknown as MongoClient;
    return { client, commandStub };
  }

  it('skips metadata check immediately when hello already reports arbiterOnly', async function () {
    server.isArbiter = true;
    const { client, commandStub } = makeClient([{ arbiterOnly: true }]);

    await (server as any)._ensureMatchingMetadataColl(client, 'insert-new');

    // Only the initial hello call; no retries needed.
    expect(commandStub).to.have.been.calledOnce;
  });

  it('retries hello until arbiterOnly is confirmed when arbiter has not yet converged', async function () {
    server.isArbiter = true;
    // First hello returns nothing; second (inside eventually) returns arbiterOnly.
    const { client, commandStub } = makeClient([{}, { arbiterOnly: true }]);

    await (server as any)._ensureMatchingMetadataColl(client, 'insert-new');

    // Two hello calls: the initial one and one successful retry.
    expect(commandStub.callCount).to.equal(2);
  });

  it('throws after timeout when isArbiter is true but server never reports arbiterOnly', async function () {
    server.isArbiter = true;
    const { client } = makeClient([{}]); // never returns arbiterOnly: true

    let err: Error | undefined;
    try {
      await (server as any)._ensureMatchingMetadataColl(client, 'insert-new', {
        intervalMs: 10,
        timeoutMs: 50,
      });
    } catch (e) {
      err = e as Error;
    }

    expect(err?.message).to.include(
      'Arbiter flag mismatch -- server should be arbiter but hello indicates it is not',
    );
  });

  it('skips metadata check when hello reports arbiterOnly but isArbiter is not yet set', async function () {
    // Simulates the deserialize() ordering: isArbiter is assigned after _populateBuildInfo runs.
    server.isArbiter = false;
    const { client, commandStub } = makeClient([{ arbiterOnly: true }]);

    await (server as any)._ensureMatchingMetadataColl(client, 'restore-check');

    expect(commandStub).to.have.been.calledOnce;
  });
});
