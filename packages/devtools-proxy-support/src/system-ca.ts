import { systemCertsAsync } from 'system-ca';
import type { Options as SystemCAOptions } from 'system-ca';
import { promises as fs } from 'fs';
import { rootCertificates } from 'tls';
import { X509Certificate } from 'crypto';

// A bit more generic than SecureContextOptions['ca'] because of Uint8Array -> Buffer + readonly
type NodeJSCAOption = string | Uint8Array | readonly (string | Uint8Array)[];

let systemCertsCachePromise:
  Promise<{ certs: string[]; asyncFallbackError?: Error }> | undefined;

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

const PEM_BEGIN = '-----BEGIN CERTIFICATE-----';
const PEM_END = '-----END CERTIFICATE-----';

export function splitPEMBundle(bundle: string): string[] {
  const pems: string[] = [];
  // The last piece follows the last END marker, so it never holds a complete
  // certificate. A truncated one must not be completed by appending the marker.
  for (const chunk of bundle.split(PEM_END).slice(0, -1)) {
    const begin = chunk.indexOf(PEM_BEGIN);
    if (begin !== -1) pems.push(chunk.slice(begin) + PEM_END);
  }
  return pems;
}

type ParsedCert = {
  cert: X509Certificate;
  notBefore: number;
  notAfter: number;
};

const parsedCertCache = new Map<string, ParsedCert | null>();

function parseCert(pem: string): ParsedCert | null {
  let parsed = parsedCertCache.get(pem);
  if (parsed === undefined) {
    try {
      const cert = new X509Certificate(pem);
      parsed = {
        cert,
        notBefore: new Date(cert.validFrom).getTime(),
        notAfter: new Date(cert.validTo).getTime(),
      };
    } catch {
      parsed = null;
    }
    parsedCertCache.set(pem, parsed);
  }
  return parsed;
}

function isCurrentlyValid({ notBefore, notAfter }: ParsedCert, now: number) {
  return notBefore <= now && now <= notAfter;
}

function describeRemoval({ cert, notBefore }: ParsedCert, now: number): string {
  return (
    `Removing ${now < notBefore ? 'not yet valid' : 'expired'} certificate ` +
    `for '${cert.subject.split('\n').join(', ')}' ` +
    `(serial no '${cert.serialNumber}', valid ${cert.validFrom} - ${cert.validTo})`
  );
}

export function findInvalidCerts(
  pems: string[],
  now = Date.now(),
): { pems: string[]; messages: string[] } {
  const invalid: { pem: string; parsed: ParsedCert }[] = [];
  for (const pem of new Set(pems)) {
    const parsed = parseCert(pem);
    if (parsed && !isCurrentlyValid(parsed, now)) invalid.push({ pem, parsed });
  }
  return {
    pems: invalid.map(({ pem }) => pem),
    messages: invalid.map(({ parsed }) => describeRemoval(parsed, now)),
  };
}

function removeCerts(bundle: string, pems: string[]): string {
  const toRemove = new Set(pems);
  const chunks = bundle.split(PEM_END);
  const last = chunks.pop() as string;
  const kept = chunks.map((chunk) => {
    const begin = chunk.indexOf(PEM_BEGIN);
    const isRemoved =
      begin !== -1 && toRemove.has(chunk.slice(begin) + PEM_END);
    return isRemoved ? chunk.slice(0, begin) : chunk + PEM_END;
  });
  return kept.join('') + last;
}

function removeInvalidCerts(ca: string): { ca: string; messages: string[] } {
  try {
    const invalid = findInvalidCerts(splitPEMBundle(ca));
    return { ca: removeCerts(ca, invalid.pems), messages: invalid.messages };
  } catch (err: unknown) {
    const reason = err instanceof Error ? err.message : String(err);
    return {
      ca,
      messages: [`Unable to remove invalid certificates: ${reason}`],
    };
  }
}

// Thin wrapper around system-ca, which merges:
// - Explicit CA options passed as options
// - The Node.js TLS root store
// - The system CA store (cached on first call)
// Expired certificates are removed from the result, wherever they come from,
// see findInvalidCerts().
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

  try {
    if (!existingOptions.excludeSystemCerts) {
      const systemCertsResult = await systemCertsCached();
      asyncFallbackError = systemCertsResult.asyncFallbackError;
      systemCerts = systemCertsResult.certs;
    }
  } catch (err: any) {
    systemCertsError = err;
  }

  const ca = mergeCA(
    systemCerts,
    rootCertificates,
    existingOptions.ca,
    await readTLSCAFilePromise,
  );
  const filtered = removeInvalidCerts(ca);

  return {
    ca: filtered.ca,
    asyncFallbackError: asyncFallbackError,
    systemCertsError,
    systemCACount: systemCerts.length + rootCertificates.length,
    messages: filtered.messages,
  };
}
