import type { ConnectConfig } from 'ssh2';

import * as path from 'path';
import { SSHClient } from '../ssh-client';
import { LocalSigningClient } from './local-signing-client';
import { RemoteSigningClient } from './remote-signing-client';

export { LocalSigningClient } from './local-signing-client';
export { RemoteSigningClient } from './remote-signing-client';

export type SigningMethod = 'gpg' | 'jsign';

export type SigningClientOptions = {
  workingDirectory: string;
  signingScript: string;
  signingMethod: SigningMethod;
};

/** Options for signing a file remotely over an SSH connection. */
export type RemoteSigningOptions = {
  /** Username for authentication. */
  username?: string;
  /** Password for password-based user authentication. */
  password?: string;
  /** Port number of the ssh server. */
  port?: number;
  /** Buffer or string that contains a private key for either key-based or hostbased user authentication (OpenSSH format). */
  privateKey?: Buffer | string;
  /** The method to sign with.  Use gpg on linux and jsign on windows. */
  signingMethod: SigningMethod;
  client: 'remote';
};

/** Options for signing a file locally. */
export type LocalSigningOptions = {
  /** The method to sign with.  Use gpg on linux and jsign on windows. */
  signingMethod: SigningMethod;

  /** Full path to the directory in which to produce the signed file. */
  directory?: string;

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
      workingDirectory: '~/garasign',
      signingScript,
      signingMethod: options.signingMethod,
    });
  }
  if (options.client === 'local') {
    // For local client, we put everything in a tmp directory to avoid
    // polluting the user's working directory.
    return new LocalSigningClient({
      workingDirectory: path.resolve(__dirname, '..', 'tmp'),
      signingScript,
      signingMethod: options.signingMethod,
    });
  }
  // @ts-expect-error `client` is a discriminated union - we should never reach here but we throw on the off-chance we do.
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
  throw new Error(`Unknown client type: ${options.client}`);
}
