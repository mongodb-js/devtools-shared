import fs from 'fs/promises';
import { exec } from 'child_process';
import { RemoteSigningClient } from './remote-signing-client';
import { expect } from 'chai';
import type { SSHClient } from '../ssh-client';

const getMockedSSHClient = () => {
  return {
    getSftpConnection: () => {
      return {
        fastPut: async (
          localFile: string,
          remoteFile: string,
          cb: (err?: Error) => void
        ) => {
          try {
            await fs.copyFile(localFile, remoteFile);
            cb();
          } catch (err) {
            cb(err as Error);
          }
        },
        fastGet: async (
          remoteFile: string,
          localFile: string,
          cb: (err?: Error) => void
        ) => {
          try {
            await fs.copyFile(remoteFile, localFile);
            cb();
          } catch (err) {
            cb(err as Error);
          }
        },
        unlink: async (remoteFile: string, cb: (err?: Error) => void) => {
          try {
            await fs.unlink(remoteFile);
            cb();
          } catch (err) {
            cb(err as Error);
          }
        },
      };
    },
    exec: (command: string) => {
      return new Promise((resolve, reject) => {
        exec(command, { shell: 'bash' }, (err) => {
          if (err) {
            return reject(err);
          }
          return resolve('Ok');
        });
      });
    },
    disconnect: () => {},
  } as unknown as SSHClient;
};

describe('RemoteSigningClient', function () {
  const workingDirectoryPath = 'working-directory';
  const fileToSign = 'file-to-sign.txt';
  const signingScript = 'script.sh';

  beforeEach(async function name() {
    await fs.writeFile(fileToSign, 'RemoteSigningClient: original content');
    await fs.writeFile(
      signingScript,
      `
        #!/bin/bash
        echo "Signing script called with arguments: $@"
        echo "RemoteSigningClient: signed content" > $1
        `
    );
  });

  afterEach(async function () {
    await Promise.allSettled([
      fs.rm(workingDirectoryPath, { recursive: true, force: true }),
      fs.rm(signingScript),
      fs.rm(fileToSign),
    ]);
  });

  it('signs the file correctly', async function () {
    const remoteSigningClient = new RemoteSigningClient(getMockedSSHClient(), {
      workingDirectory: workingDirectoryPath,
      signingScript: signingScript,
      signingMethod: 'gpg',
    });

    await remoteSigningClient.sign(fileToSign);

    const signedFile = (await fs.readFile(fileToSign, 'utf-8')).trim();
    expect(signedFile).to.equal('RemoteSigningClient: signed content');
  });
});
