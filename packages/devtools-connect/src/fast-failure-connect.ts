// It probably makes sense to put this into its own package/repository once
// other tools start using it.

function isFastFailureConnectionSingleError(
  error: Error & { code?: string }
): boolean {
  switch (error.name) {
    case 'MongoNetworkError':
      return /\b(ECONNREFUSED|ENOTFOUND|ENETUNREACH|EINVAL)\b/.test(
        error.message
      );
    case 'MongoError':
      return /The apiVersion parameter is required/.test(error.message);
    default:
      return (
        ['ECONNREFUSED', 'ENOTFOUND', 'ENETUNREACH', 'EINVAL'].includes(
          error.code ?? ''
        ) || isPotentialTLSCertificateError(error)
      );
  }
}

export const isFastFailureConnectionError = handleNestedErrors(
  isFastFailureConnectionSingleError
);

function isPotentialTLSCertificateSingleError(
  error: Error & { code?: string }
): boolean {
  // https://nodejs.org/api/tls.html#x509-certificate-error-codes
  return [
    'UNABLE_TO_GET_ISSUER_CERT',
    'UNABLE_TO_GET_CRL',
    'UNABLE_TO_DECRYPT_CERT_SIGNATURE',
    'UNABLE_TO_DECRYPT_CRL_SIGNATURE',
    'UNABLE_TO_DECODE_ISSUER_PUBLIC_KEY',
    'CERT_SIGNATURE_FAILURE',
    'CRL_SIGNATURE_FAILURE',
    'CERT_NOT_YET_VALID',
    'CERT_HAS_EXPIRED',
    'CRL_NOT_YET_VALID',
    'CRL_HAS_EXPIRED',
    'ERROR_IN_CERT_NOT_BEFORE_FIELD',
    'ERROR_IN_CERT_NOT_AFTER_FIELD',
    'ERROR_IN_CRL_LAST_UPDATE_FIELD',
    'ERROR_IN_CRL_NEXT_UPDATE_FIELD',
    'OUT_OF_MEM',
    'DEPTH_ZERO_SELF_SIGNED_CERT',
    'SELF_SIGNED_CERT_IN_CHAIN',
    'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
    'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
    'CERT_CHAIN_TOO_LONG',
    'CERT_REVOKED',
    'INVALID_CA',
    'PATH_LENGTH_EXCEEDED',
    'INVALID_PURPOSE',
    'CERT_UNTRUSTED',
    'CERT_REJECTED',
    'HOSTNAME_MISMATCH',
  ].includes(error.code ?? '');
}

export const isPotentialTLSCertificateError = handleNestedErrors(
  isPotentialTLSCertificateSingleError
);

// Convenience wrapper that ensures that the given error is an `Error` instance
// and that handles nested errors (.cause/AggregateError) as well
function handleNestedErrors(
  fn: (err: Error & { code?: string }) => boolean
): (err: unknown) => boolean {
  const checker = (err: unknown): boolean => {
    if (
      Object.prototype.toString.call(err).toLowerCase() !== '[object error]'
    ) {
      return checker(new Error(String(err)));
    }
    if (!err || typeof err !== 'object') return false; // Make TS happy
    if ('cause' in err && checker(err.cause)) {
      return true; // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/cause
    }
    if (
      'errors' in err &&
      Array.isArray(err.errors) &&
      err.errors.some((err) => checker(err))
    ) {
      return true; // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AggregateError
    }
    return fn(err as Error);
  };
  return checker;
}
