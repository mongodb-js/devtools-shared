import { promisify } from 'util';
import { exec } from 'child_process';

const ONE_HOUR = 1000 * 60 * 60;

export async function runInDir(
  command: string,
  cwd = process.cwd(),
  timeout = ONE_HOUR
) {
  const execPromise = promisify(exec)(command, {
    cwd,
    timeout,
  });
  return await execPromise;
}
