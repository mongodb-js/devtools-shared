import { once } from 'events';
import { createServer } from 'net';

/** Whether a fresh socket can bind `port` on 127.0.0.1. */
export async function isBindable(port: number): Promise<boolean> {
  const server = createServer();
  try {
    server.listen(port, '127.0.0.1');
    await once(server, 'listening');
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'EADDRINUSE') return false;
    throw err;
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}
