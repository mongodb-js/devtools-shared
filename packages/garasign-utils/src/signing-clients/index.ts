import type { ConnectConfig } from 'ssh2';

import * as path from 'path';
import { SSHClient } from '../ssh-client';
import { LocalSigningClient } from './local-signing-client';
import { RemoteSigningClient } from './remote-signing-client';

export { LocalSigningClient } from './local-signing-client';
export { RemoteSigningClient } from './remote-signing-client';

export type SigningClientOptions = {
  rootDir: string;
  signingScript: string;
};

export type ClientType = 'local' | 'remote';
export type ClientOptions<T> = T extends 'remote'
  ? Pick<ConnectConfig, 'username' | 'host' | 'privateKey' | 'port'>
  : T extends 'local'
  ? undefined
  : never;

export interface SigningClient {
  sign(file: string): Promise<void>;
}

export async function getSigningClient<T extends ClientType>(
  clientType: T,
  options: ClientOptions<T>
): Promise<SigningClient> {
  async function getSshClient(sshOptions: ConnectConfig) {
    const sshClient = new SSHClient(sshOptions);
    await sshClient.connect();
    return sshClient;
  }

  function getSigningScript() {
    return path.join(__dirname, '..', 'src', './garasign.sh');
  }

  if (clientType === 'remote') {
    const sshClient = await getSshClient(options as ConnectConfig);
    // Currently only linux remote is supported to sign the artifacts
    return new RemoteSigningClient(sshClient, {
      rootDir: '~/garasign',
      signingScript: getSigningScript(),
    });
  }
  if (clientType === 'local') {
    // For local client, we put everything in a tmp directory to avoid
    // polluting the user's working directory.
    return new LocalSigningClient({
      rootDir: path.resolve(__dirname, '..', 'tmp'),
      signingScript: getSigningScript(),
    });
  }
  throw new Error(`Unknown client type: ${clientType}`);
}
