import fs from 'fs/promises';
import { LocalSigningClient } from './local-signing-client';
import { expect } from 'chai';
import { writeFileSync } from 'fs';

describe('LocalSigningClient', function () {
  const signingScript = './garasign-temp.sh';
  const fileToSign = 'file-to-sign.txt';
  const fileNameAfterGpgSigning = 'file-to-sign.txt.sig';

  beforeEach(async function () {
    writeFileSync(
      signingScript,
      `
        #!/bin/bash
        echo "Signing script called with arguments: $@"
        echo "signed content" > ${fileNameAfterGpgSigning}
        `
    );
    await fs.writeFile(fileToSign, 'original content');
  });

  afterEach(async function () {
    await Promise.allSettled(
      [signingScript, fileToSign, fileNameAfterGpgSigning].map((file) =>
        fs.rm(file)
      )
    );
  });

  it('executes the signing script correctly', async function () {
    const localSigningClient = new LocalSigningClient({
      signingScript: signingScript,
      signingMethod: 'gpg',
    });

    await localSigningClient.sign(fileToSign);

    const signedFile = (
      await fs.readFile(fileNameAfterGpgSigning, 'utf-8')
    ).trim();
    expect(signedFile).to.equal('signed content');
  });
});
