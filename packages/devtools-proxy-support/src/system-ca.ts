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

export function resetSystemCACache(systemCAOpts: SystemCAOptions = {}) {
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

export function mergeCA(...args: (NodeJSCAOption | undefined)[]): string {
  const ca = new Set<string>();
  for (const item of args) {
    if (!item) continue;
    const caList: readonly (string | Uint8Array)[] = Array.isArray(item)
      ? item
      : [item];
    for (const cert of caList) {
      const asString =
        typeof cert === 'string'
          ? cert
          : Buffer.from(cert.buffer, cert.byteOffset, cert.byteLength).toString(
              'utf8'
            );
      ca.add(asString);
    }
  }
  return [...ca].join('\n');
}

const pemWithParsedCache = new WeakMap<
  string[],
  {
    ca: string[];
    messages: string[];
  }
>();
// TODO(COMPASS-8253): Remove this in favor of OpenSSL's X509_V_FLAG_PARTIAL_CHAIN
// See linked tickets for details on why we need this (tl;dr: the system certificate
// store may contain intermediate certficiates without the corresponding trusted root,
// and OpenSSL does not seem to accept that)
export function removeCertificatesWithoutIssuer(ca: string[]): {
  ca: string[];
  messages: string[];
} {
  let result:
    | {
        ca: string[];
        messages: string[];
      }
    | undefined = pemWithParsedCache.get(ca);

  const messages: string[] = [];
  let caWithParsedCerts = ca.map((pem) => {
    let parsed: X509Certificate | null = null;
    try {
      parsed = new X509Certificate(pem);
    } catch (err: unknown) {
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
  caWithParsedCerts = caWithParsedCerts.filter(({ parsed }) => {
    const keep =
      !parsed ||
      parsed.checkIssued(parsed) ||
      caWithParsedCerts.find(
        ({ parsed: issuer }) => issuer && parsed.checkIssued(issuer)
      );
    if (!keep) {
      messages.push(
        `Removing certificate for '${parsed.subject}' because issuer '${parsed.issuer}' could not be found (serial no '${parsed.serialNumber}')`
      );
    }
    return keep;
  });
  result = { ca: caWithParsedCerts.map(({ pem }) => pem), messages };
  pemWithParsedCache.set(ca, result);
  return result;
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
  let systemCerts: string[] = [];
  let messages: string[] = [];

  try {
    ({ certs: systemCerts, asyncFallbackError } = await systemCertsCached());
  } catch (err: any) {
    systemCertsError = err;
  }

  if (
    !(
      allowCertificatesWithoutIssuer ??
      !!process.env.DEVTOOLS_ALLOW_CERTIFICATES_WITHOUT_ISSUER
    )
  ) {
    const reducedList = removeCertificatesWithoutIssuer(systemCerts);
    systemCerts = reducedList.ca;
    messages = messages.concat(reducedList.messages);
  }

  return {
    ca: mergeCA(
      systemCerts,
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
