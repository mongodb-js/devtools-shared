import { expect } from 'chai';
import type { ServerNotification } from '@modelcontextprotocol/sdk/types.js';
import { createStartProgress, type ProgressContext } from './start-progress';

function createFakeContext(progressToken?: string | number): {
  context: ProgressContext;
  notifications: ServerNotification[];
} {
  const notifications: ServerNotification[] = [];
  return {
    notifications,
    context: {
      _meta: progressToken === undefined ? {} : { progressToken },
      sendNotification: async (notification) => {
        notifications.push(notification);
      },
    },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('createStartProgress', function () {
  it('does nothing when the client did not send a progress token', async function () {
    const { context, notifications } = createFakeContext();
    const progress = createStartProgress(context, { heartbeatIntervalMs: 1 });

    await progress.report('Starting');
    await sleep(10);
    progress.stop();

    expect(notifications).to.be.empty;
  });

  it('reports numbered progress updates carrying the token', async function () {
    const { context, notifications } = createFakeContext('token-1');
    const progress = createStartProgress(context, {
      heartbeatIntervalMs: 60_000,
    });

    await progress.report('Starting');
    await progress.report('Ready');
    progress.stop();

    expect(notifications).to.deep.equal([
      {
        method: 'notifications/progress',
        params: { progressToken: 'token-1', progress: 1, message: 'Starting' },
      },
      {
        method: 'notifications/progress',
        params: { progressToken: 'token-1', progress: 2, message: 'Ready' },
      },
    ]);
  });

  it('keeps reporting elapsed time until stopped', async function () {
    const { context, notifications } = createFakeContext(7);
    const progress = createStartProgress(context, {
      heartbeatIntervalMs: 5,
      startedAt: Date.now() - 3000,
    });

    await sleep(30);
    progress.stop();
    const afterStop = notifications.length;

    expect(afterStop).to.be.greaterThan(1);

    const first = notifications[0] as {
      params: {
        progressToken: string | number;
        progress: number;
        message?: string;
      };
    };
    expect(first.params.progressToken).to.equal(7);
    expect(first.params.progress).to.equal(1);
    expect(first.params.message).to.match(
      /^Still starting the cluster \(\d+s elapsed\)\.$/,
    );

    await sleep(30);
    expect(notifications).to.have.lengthOf(afterStop);
  });
});
