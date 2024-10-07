import { systemCertsAsync } from 'system-ca';
import type { Options as SystemCAOptions } from 'system-ca';
import { promises as fs } from 'fs';
import { rootCertificates } from 'tls';
import { X509Certificate } from 'crypto';

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
        'utf8'
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

export type ParsedX509Cert = { pem: string; parsed: X509Certificate | null };

/**
 * Safely parse provided certs, push any encountered errors to the provided
 * messages array
 */
export function parseCACerts(
  ca: NodeJSCAOption,
  messages: string[]
): ParsedX509Cert[] {
  ca = Array.isArray(ca) ? ca : [ca];
  return ca.map((cert) => {
    const pem = certToString(cert);
    let parsed: X509Certificate | null = null;
    try {
      parsed = new X509Certificate(pem);
    } catch (err: unknown) {
      // Most definitely should happen never or extremely rarely, in case it
      // does, if this cert will affect the TLS connection verification, the
      // connection will most definitely fail and we'll see it in the logs. For
      // that reason we're just logging, but not throwing an error here
      messages.push(
        `Unable to parse certificate: ${
          err && typeof err === 'object' && 'message' in err
            ? String(err.message)
            : String(err)
        }`
      );
    }
    return { pem, parsed };
  });
}

function certificateHasMatchingIssuer(
  cert: X509Certificate,
  certs: ParsedX509Cert[]
) {
  return (
    cert.checkIssued(cert) ||
    certs.some(({ parsed: issuer }) => {
      return issuer && cert.checkIssued(issuer);
    })
  );
}

const withRemovedMissingIssuerCache = new WeakMap<
  ParsedX509Cert[],
  {
    ca: ParsedX509Cert[];
    messages: string[];
  }
>();

// TODO(COMPASS-8253): Remove this in favor of OpenSSL's X509_V_FLAG_PARTIAL_CHAIN
// See linked tickets for details on why we need this (tl;dr: the system certificate
// store may contain intermediate certficiates without the corresponding trusted root,
// and OpenSSL does not seem to accept that)
export function removeCertificatesWithoutIssuer(
  ca: ParsedX509Cert[],
  messages: string[]
): ParsedX509Cert[] {
  const result:
    | {
        ca: ParsedX509Cert[];
        messages: string[];
      }
    | undefined = withRemovedMissingIssuerCache.get(ca);

  if (result) {
    messages.push(...result.messages);
    return result.ca;
  }

  const _messages: string[] = [];
  const filteredCAlist = ca.filter((cert) => {
    // If cert was not parsed, we want to keep it in the list. The case should
    // be generally very rare, but in case it happens and this cert will affect
    // the TLS handshake, it will show up in the logs as the connection error
    // anyway, so it's safe to keep it
    const keep = !cert.parsed || certificateHasMatchingIssuer(cert.parsed, ca);
    if (!keep && cert.parsed) {
      const { parsed } = cert;
      _messages.push(
        `Removing certificate for '${parsed.subject}' because issuer '${parsed.issuer}' could not be found (serial no '${parsed.serialNumber}')`
      );
    }
    return keep;
  });
  withRemovedMissingIssuerCache.set(ca, {
    ca: filteredCAlist,
    messages: _messages,
  });
  messages.push(..._messages);
  return filteredCAlist;
}

/**
 * Sorts cerificates by the Not After value. Items that are higher in the list
 * get picked up first by the CA issuer finding logic
 *
 * @see {@link https://jira.mongodb.org/browse/COMPASS-8322}
 */
export function sortByExpirationDate(ca: ParsedX509Cert[]) {
  return ca.slice().sort((a, b) => {
    if (!a.parsed || !b.parsed) {
      return 0;
    }
    return (
      new Date(b.parsed.validTo).getTime() -
      new Date(a.parsed.validTo).getTime()
    );
  });
}

const nodeVersion = process.versions.node.split('.').map(Number);

export function tlsSupportsAllowPartialTrustChainFlag(): boolean {
  // TODO: Remove this flag and all X.509 parsing here once all our products
  // are at least on these Node.js versions
  return (
    (nodeVersion[0] >= 22 && nodeVersion[1] >= 9) || // https://github.com/nodejs/node/commit/c2bf0134c
    (nodeVersion[0] === 20 && nodeVersion[1] >= 18)
  ); // https://github.com/nodejs/node/commit/1b3420274
}

// Thin wrapper around system-ca, which merges:
// - Explicit CA options passed as options
// - The Node.js TLS root store
// - The system CA store (cached on first call)
export async function systemCA(
  existingOptions: {
    ca?: NodeJSCAOption;
    tlsCAFile?: string | null | undefined;
  } = {},
  allowCertificatesWithoutIssuer?: boolean // defaults to false
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
  let systemCerts: ParsedX509Cert[] = [];

  const messages: string[] = [];

  const _tlsSupportsAllowPartialTrustChainFlag =
    tlsSupportsAllowPartialTrustChainFlag();
  try {
    const systemCertsResult = await systemCertsCached();
    asyncFallbackError = systemCertsResult.asyncFallbackError;
    if (_tlsSupportsAllowPartialTrustChainFlag) {
      systemCerts = systemCertsResult.certs.map((pem) => ({
        pem,
        parsed: null,
      }));
    } else {
      systemCerts = parseCACerts(systemCertsResult.certs, messages);
    }
  } catch (err: any) {
    systemCertsError = err;
  }

  if (
    !(
      allowCertificatesWithoutIssuer ??
      !!process.env.DEVTOOLS_ALLOW_CERTIFICATES_WITHOUT_ISSUER
    ) &&
    !_tlsSupportsAllowPartialTrustChainFlag
  ) {
    systemCerts = removeCertificatesWithoutIssuer(systemCerts, messages);
  }

  return {
    ca: mergeCA(
      (_tlsSupportsAllowPartialTrustChainFlag
        ? systemCerts
        : sortByExpirationDate(systemCerts)
      ).map(({ pem }) => pem),
      rootCertificates,
      existingOptions.ca,
      await readTLSCAFilePromise
    ),
    asyncFallbackError: asyncFallbackError,
    systemCertsError,
    systemCACount: systemCerts.length + rootCertificates.length,
    messages,
  };
}
