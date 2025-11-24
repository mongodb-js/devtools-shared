import * as x509 from '@peculiar/x509';
import { webcrypto } from 'crypto';
import { uuid } from './util';
import path from 'path';
import { writeFile, readFile } from 'fs/promises';
import type { MongoClientOptions } from 'mongodb';
x509.cryptoProvider.set(webcrypto as typeof crypto);

export interface TLSClientOptions {
  tlsAddClientKey?: boolean;
  args?: string[];
  tmpDir: string;
  internalClientOptions?: Partial<MongoClientOptions>;
}

export async function handleTLSClientKeyOptions({
  tlsAddClientKey,
  args: [...args] = [],
  tmpDir,
  internalClientOptions = {},
}: TLSClientOptions): Promise<Partial<TLSClientOptions>> {
  const existingTLSCAOptionIndex = args.findIndex((arg) =>
    arg.match(/^--tls(Cluster)?CAFile(=|$)/),
  );

  if (tlsAddClientKey === false) return {};
  if (tlsAddClientKey !== true && existingTLSCAOptionIndex === -1) return {};
  if (tlsAddClientKey !== true && internalClientOptions.tlsCertificateKeyFile)
    return {};

  const alg: RsaHashedKeyGenParams = {
    name: 'RSASSA-PKCS1-v1_5',
    hash: 'SHA-256',
    publicExponent: new Uint8Array([1, 0, 1]),
    modulusLength: 2048,
  };
  const now = Date.now();
  const keys = await webcrypto.subtle.generateKey(alg, true, [
    'sign',
    'verify',
  ]);
  const cert = await x509.X509CertificateGenerator.createSelfSigned({
    name: 'O=MongoDB, OU=MongoDBRunnerCA, CN=MongoDBRunnerCA',
    notBefore: new Date(now - 1000 * 60 * 60),
    notAfter: new Date(now + 1000 * 60 * 60 * 24 * 365 * 10),
    signingAlgorithm: alg,
    keys,
    extensions: [
      await x509.SubjectKeyIdentifierExtension.create(keys.publicKey),
    ],
  });
  const clientPEMContent = Buffer.from(cert.toString('pem') + '\n');

  const existingTLSCAOptionHasValue =
    args[existingTLSCAOptionIndex].includes('=');
  const existingTLSCAOption = args[existingTLSCAOptionIndex].split('=')[0];
  const existingTLSCAOptionValue = existingTLSCAOptionHasValue
    ? args[existingTLSCAOptionIndex].split('=')[1]
    : args[existingTLSCAOptionIndex + 1];

  const id = uuid();
  const clientPEM = path.join(tmpDir, `mongodb-runner-client-${id}.pem`);
  const caPEM = path.join(tmpDir, `mongodb-runner-ca-${id}.pem`);

  await Promise.all([
    (async () => {
      await writeFile(
        clientPEM,
        Buffer.concat([
          clientPEMContent,
          Buffer.from(
            pkcs8ToPEM(
              await webcrypto.subtle.exportKey('pkcs8', keys.privateKey),
            ),
          ),
        ]),
      );
    })(),
    (async () => {
      await writeFile(
        caPEM,
        Buffer.concat([
          clientPEMContent,
          await readFile(existingTLSCAOptionValue),
        ]),
      );
    })(),
  ]);

  args.splice(
    existingTLSCAOptionIndex,
    existingTLSCAOptionHasValue ? 1 : 2,
    `${existingTLSCAOption}=${caPEM}`,
  );

  return {
    args,
    tlsAddClientKey: false,
    internalClientOptions: {
      tlsCertificateKeyFile: clientPEM,
      tlsAllowInvalidCertificates: true,
      tls: true,
      ...internalClientOptions,
    },
  };
}

function pkcs8ToPEM(pkcs8Buffer: ArrayBuffer): string {
  const b64 = Buffer.from(pkcs8Buffer).toString('base64');
  return `-----BEGIN PRIVATE KEY-----\n${b64.match(/.{1,64}/g)?.join('\n') || ''}\n-----END PRIVATE KEY-----\n`;
}
