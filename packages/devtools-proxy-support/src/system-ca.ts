import { systemCertsAsync } from 'system-ca';
import type { Options as SystemCAOptions } from 'system-ca';
import { promises as fs } from 'fs';
import { rootCertificates } from 'tls';
import { X509Certificate } from 'crypto';
import type { KeyObject } from 'crypto';

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
  subject: string;
  notBefore: number;
  notAfter: number;
};
type ParsedPEM = ParsedCert & { pem: string };

const parsedCertCache = new Map<string, ParsedCert | null>();

function parseCert(pem: string): ParsedCert | null {
  let parsed = parsedCertCache.get(pem);
  if (parsed === undefined) {
    try {
      const cert = new X509Certificate(pem);
      parsed = {
        cert,
        subject: cert.subject,
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

function groupBy<T>(items: T[], keyOf: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const group = groups.get(key);
    if (group) {
      group.push(item);
    } else {
      groups.set(key, [item]);
    }
  }
  return groups;
}

function groupByPublicKey(entries: ParsedPEM[]): ParsedPEM[][] {
  const groups: { key: KeyObject; members: ParsedPEM[] }[] = [];
  for (const entry of entries) {
    let key: KeyObject;
    try {
      key = entry.cert.publicKey;
    } catch {
      continue;
    }
    const group = groups.find((other) => other.key.equals(key));
    if (group) {
      group.members.push(entry);
    } else {
      groups.push({ key, members: [entry] });
    }
  }
  return groups.map(({ members }) => members);
}

function describeRemoval({ cert }: ParsedCert): string {
  return (
    `Removing certificate for '${cert.subject.split('\n').join(', ')}' ` +
    `(serial no '${cert.serialNumber}', valid ${cert.validFrom} - ${cert.validTo}) ` +
    'because a currently valid certificate with the same subject and key exists'
  );
}

function invalidCertsWithValidDuplicate(
  sameKey: ParsedPEM[],
  now: number,
): ParsedPEM[] {
  return sameKey.some((entry) => isCurrentlyValid(entry, now))
    ? sameKey.filter((entry) => !isCurrentlyValid(entry, now))
    : [];
}

/**
 * Finds expired (or not yet valid) certificates for which the list also
 * contains a currently valid certificate with the same subject and the same
 * public key, i.e. a CA that was renewed without rotating its key. Nothing else
 * is reported: certificates without such a duplicate, or that cannot be parsed,
 * are left alone.
 */
export function findInvalidCertsWithValidDuplicate(
  pems: string[],
  now = Date.now(),
): { pems: string[]; messages: string[] } {
  const entries = [...new Set(pems)].flatMap((pem) => {
    const parsed = parseCert(pem);
    return parsed ? [{ pem, ...parsed }] : [];
  });

  const invalid: ParsedPEM[] = [];
  for (const sameSubject of groupBy(
    entries,
    ({ subject }) => subject,
  ).values()) {
    if (sameSubject.length === 1) continue;
    for (const sameKey of groupByPublicKey(sameSubject)) {
      invalid.push(...invalidCertsWithValidDuplicate(sameKey, now));
    }
  }
  return {
    pems: invalid.map(({ pem }) => pem),
    messages: invalid.map(describeRemoval),
  };
}

function removeCerts(bundle: string, pems: string[]): string {
  return pems.reduce((text, pem) => text.split(pem).join(''), bundle);
}

function removeInvalidCerts(ca: string): { ca: string; messages: string[] } {
  try {
    const invalid = findInvalidCertsWithValidDuplicate(splitPEMBundle(ca));
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
// Expired certificates that have a currently valid duplicate are removed from
// the result, wherever they come from, see findInvalidCertsWithValidDuplicate().
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
