import fs from 'fs/promises';
import { exec } from 'child_process';
import { RemoteSigningClient } from './remote-signing-client';
import { expect } from 'chai';
import type { SSHClient } from '../ssh-client';
import { promisify } from 'util';

const getMockedSSHClient = () => {
  return {
    // The mocked ssh client
    copyFile: (from: string, to: string) => fs.copyFile(from, to),
    downloadFile: (remote: string, local: string) => fs.copyFile(remote, local),
    removeFile: fs.unlink.bind(fs.unlink),
    exec: (command: string) =>
      promisify(exec)(command, { shell: 'bash' }).then(() => 'Ok'),
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
      signingMethod: 'jsign',
    });

    await remoteSigningClient.sign(fileToSign);

    const signedFile = (await fs.readFile(fileToSign, 'utf-8')).trim();
    expect(signedFile).to.equal('RemoteSigningClient: signed content');
  });
});
