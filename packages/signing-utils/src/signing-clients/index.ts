import type { ConnectConfig } from 'ssh2';

import * as path from 'path';
import { SSHClient } from '../ssh-client';
import { LocalSigningClient } from './local-signing-client';
import { RemoteSigningClient } from './remote-signing-client';

export { LocalSigningClient } from './local-signing-client';
export { RemoteSigningClient } from './remote-signing-client';

export type SigningOptions =
  | {
      method: 'gpg';
    }
  | {
      method: 'jsign';
      // The alias of the certificate used for signing in the keystore
      certificateAlias: 'compass' | 'mongosh';
      // The URL of the timestamping authority.
      timestampUrl?: string;
    };

export type SigningClientOptions = {
  workingDirectory: string;
  signingScript: string;
  signingOptions: SigningOptions;
};

/** Options for signing a file remotely over an SSH connection. */
export type RemoteSigningOptions = {
  /** Hostname or IP address of the server to */
  host?: string;
  /** Username for authentication. */
  username?: string;
  /** Password for password-based user authentication. */
  password?: string;
  /** Port number of the ssh server. */
  port?: number;
  /** Buffer or string that contains a private key for either key-based or hostbased user authentication (OpenSSH format). */
  privateKey?: Buffer | string;

  signingOptions: SigningOptions;
  /**
   * The path of the working directory in which to sign files **on the remote ssh server**.  Defaults to `/home/ubuntu/garasign`.
   */
  workingDirectory?: string;
  client: 'remote';
};

/** Options for signing a file locally. */
export type LocalSigningOptions = {
  signingOptions: SigningOptions;
  client: 'local';
};

export type ClientOptions = RemoteSigningOptions | LocalSigningOptions;

export interface SigningClient {
  sign(file: string): Promise<void>;
}

export async function getSigningClient(
  options: ClientOptions
): Promise<SigningClient> {
  async function getSshClient(sshOptions: ConnectConfig) {
    const sshClient = new SSHClient(sshOptions);
    await sshClient.connect();
    return sshClient;
  }

  const signingScript = path.join(__dirname, '../..', 'src', './garasign.sh');

  if (options.client === 'remote') {
    const sshClient = await getSshClient(options);
    // Currently only linux remote is supported to sign the artifacts
    return new RemoteSigningClient(sshClient, {
      workingDirectory: options.workingDirectory ?? '/home/ubuntu/garasign',
      signingScript,
      signingOptions: options.signingOptions,
    });
  }
  if (options.client === 'local') {
    return new LocalSigningClient({
      signingScript,
      signingOptions: options.signingOptions,
    });
  }
  // @ts-expect-error `client` is a discriminated union - we should never reach here but we throw on the off-chance we do.
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
  throw new Error(`Unknown client type: ${options.client}`);
}
