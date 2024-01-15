import path from 'path';
import { spawnSync } from 'child_process';
import { debug, getEnv } from '../utils';
import type { SigningClient, SigningClientOptions } from '.';

const localClientDebug = debug.extend('LocalSigningClient');

/**
 * The local signing client signs a file locally (as opposed to over an SSH connection).
 *
 * The LocalSigningClient takes the directory of the file to sign and uses this as a
 * working directory.  No temp directory / copying of files is necessary.
 */
export class LocalSigningClient implements SigningClient {
  constructor(
    private options: Omit<SigningClientOptions, 'workingDirectory'>
  ) {}

  // we want to wrap any errors in promise rejections, so even though there is no
  // await statement, we use an `async` function
  // eslint-disable-next-line @typescript-eslint/require-await
  async sign(file: string): Promise<void> {
    localClientDebug(`Signing ${file}`);

    const directoryOfFileToSign = path.dirname(file);

    try {
      const env = {
        ...getEnv(),
        method: this.options.signingMethod,
      };

      const { stdout, stderr, status } = spawnSync(
        'bash',
        [this.options.signingScript, path.basename(file)],
        {
          cwd: directoryOfFileToSign,
          env,
          encoding: 'utf-8',
        }
      );

      localClientDebug({ stdout, stderr });

      if (status !== 0) {
        throw new Error(
          JSON.stringify({
            stdout,
            stderr,
          })
        );
      }
      localClientDebug(`Signed file ${file}`);
    } catch (error) {
      localClientDebug({ error });
      throw error;
    }
  }
}
