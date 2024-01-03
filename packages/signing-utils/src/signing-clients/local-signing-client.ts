import path from 'path';
import { spawnSync } from 'child_process';
import { debug, getEnv, signedFileName } from '../utils';
import type { SigningClient, SigningClientOptions } from '.';

const localClientDebug = debug.extend('LocalSigningClient');

/**
 * The local signing client signs a file locally (as opposed to over an SSH connection).
 *
 * The LocalSigningClient takes the directory of the file to sign and uses this as a
 * working directory.  No temp directory / copying of files is necessary.
 */
export class LocalSigningClient implements SigningClient {
  constructor(private options: SigningClientOptions) {}

  sign(file: string): Promise<void> {
    localClientDebug(`Signing ${file}`);

    const directoryOfFileToSign = path.dirname(file);

    try {
      const env = {
        ...getEnv(),
        method: this.options.signingMethod,
      };

      spawnSync('bash', [this.options.signingScript, path.basename(file)], {
        cwd: directoryOfFileToSign,
        env,
        encoding: 'utf-8',
      });

      localClientDebug(
        `Signed file ${file} - output file ${signedFileName(file, {
          ...this.options,
        })}`
      );

      return Promise.resolve();
    } catch (error) {
      localClientDebug({ error });
      throw error;
    }
  }
}
