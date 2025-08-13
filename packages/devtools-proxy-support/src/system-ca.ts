import { systemCertsAsync } from 'system-ca';
import type { Options as SystemCAOptions } from 'system-ca';
import { promises as fs } from 'fs';
import { rootCertificates } from 'tls';

// A bit more generic than SecureContextOptions['ca'] because of Uint8Array -> Buffer + readonly
type NodeJSCAOption = string | Uint8Array | readonly (string | Uint8Array)[];

let systemCertsCachePromise:
  | Promise<{ certs: string[]; asyncFallbackError?: Error }>
  | undefined;

export function resetSystemCACache(systemCAOpts: SystemCAOptions = {}): void {
  systemCertsCachePromise = undefined;
  systemCertsCached(systemCAOpts).catch(() => undefined);
}

function systemCertsCached(systemCAOpts: SystemCAOptions = {}): Promise<{
  certs: string[];
  asyncFallbackError?: Error;
}> {
  if (systemCertsCachePromise) return systemCertsCachePromise;
  systemCertsCachePromise = (async () => {
    const certs = await systemCertsAsync(systemCAOpts);
    return { certs, asyncFallbackError: systemCAOpts.asyncFallbackError };
  })();
  systemCertsCachePromise.catch(() => {
    /* handle later */
  });
  return systemCertsCachePromise;
}

function certToString(cert: string | Uint8Array) {
  return typeof cert === 'string'
    ? cert
    : Buffer.from(cert.buffer, cert.byteOffset, cert.byteLength).toString(
        'utf8',
      );
}

export function mergeCA(...args: (NodeJSCAOption | undefined)[]): string {
  const ca = new Set<string>();
  for (const item of args) {
    if (!item) continue;
    const caList = Array.isArray(item) ? item : [item];
    for (const cert of caList) {
      ca.add(certToString(cert));
    }
  }
  return [...ca].join('\n');
}

// Thin wrapper around system-ca, which merges:
// - Explicit CA options passed as options
// - The Node.js TLS root store
// - The system CA store (cached on first call)
export async function systemCA(
  existingOptions: {
    ca?: NodeJSCAOption;
    tlsCAFile?: string | null | undefined;
    excludeSystemCerts?: boolean;
  } = {},
): Promise<{
  ca: string;
  systemCACount: number;
  asyncFallbackError?: Error;
  systemCertsError?: Error;
  messages: string[];
}> {
  let readTLSCAFilePromise: Promise<string> | undefined;
  if (existingOptions.tlsCAFile) {
    readTLSCAFilePromise = fs.readFile(existingOptions.tlsCAFile, 'utf8');
    readTLSCAFilePromise.catch(() => {
      /* handle later */
    });
  }

  let systemCertsError: Error | undefined;
  let asyncFallbackError: Error | undefined;
  let systemCerts: string[] = [];

  const messages: string[] = [];

  try {
    if (!existingOptions.excludeSystemCerts) {
      const systemCertsResult = await systemCertsCached();
      asyncFallbackError = systemCertsResult.asyncFallbackError;
      systemCerts = systemCertsResult.certs;
    }
  } catch (err: any) {
    systemCertsError = err;
  }

  return {
    ca: mergeCA(
      systemCerts,
      rootCertificates,
      existingOptions.ca,
      await readTLSCAFilePromise,
    ),
    asyncFallbackError: asyncFallbackError,
    systemCertsError,
    systemCACount: systemCerts.length + rootCertificates.length,
    messages,
  };
}
