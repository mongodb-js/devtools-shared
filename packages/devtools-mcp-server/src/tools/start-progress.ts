import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type {
  ServerNotification,
  ServerRequest,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * The parts of the request context progress reporting needs. Narrower than the
 * SDK's `RequestHandlerExtra` so tests can provide a plain object.
 */
export type ProgressContext = Pick<
  RequestHandlerExtra<ServerRequest, ServerNotification>,
  '_meta' | 'sendNotification'
>;

export const DEFAULT_HEARTBEAT_INTERVAL_MS = 10_000;

export interface StartProgress {
  /** Sends a progress notification for the current tool call, if the client asked for one. */
  report(message: string): Promise<void>;
  /** Stops periodic updates. */
  stop(): void;
}

/**
 * MCP progress is opt-in: the client sends `_meta.progressToken` with the
 * request, and every `notifications/progress` must carry it back. When no token
 * is present all of this is a no-op.
 */
export function createStartProgress(
  context: ProgressContext,
  {
    startedAt = Date.now(),
    heartbeatIntervalMs = DEFAULT_HEARTBEAT_INTERVAL_MS,
  }: { startedAt?: number; heartbeatIntervalMs?: number } = {},
): StartProgress {
  const progressToken = context._meta?.progressToken;
  if (progressToken === undefined) {
    return { report: () => Promise.resolve(), stop: () => undefined };
  }

  let progress = 0;
  // Notifications are chained so that progress values arrive in order.
  let pending = Promise.resolve();

  // An arrow function (unlike a hoisted declaration) keeps the narrowing of
  // `progressToken` from the early return above.
  const report = (message: string): Promise<void> => {
    progress += 1;
    pending = pending
      .then(() =>
        context.sendNotification({
          method: 'notifications/progress',
          params: { progressToken, progress, message },
        }),
      )
      // A disconnected client must not turn a starting cluster into a failed tool call.
      .catch(() => undefined);
    return pending;
  };

  const heartbeat = setInterval(() => {
    const elapsed = Math.round((Date.now() - startedAt) / 1000);
    void report(`Still starting the cluster (${elapsed}s elapsed).`);
  }, heartbeatIntervalMs);
  heartbeat.unref();

  return {
    report,
    stop() {
      clearInterval(heartbeat);
    },
  };
}
