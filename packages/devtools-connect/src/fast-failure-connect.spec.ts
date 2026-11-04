import { expect } from 'chai';
import vm from 'vm';
import {
  isFastFailureConnectionError,
  isPotentialTLSCertificateError,
} from './fast-failure-connect';

class MongoNetworkError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = this.constructor.name;
  }
}
class MongoError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = this.constructor.name;
  }
}

describe('isFastFailureConnectionError', function () {
  it('returns true for ECONNREFUSED', function () {
    expect(
      isFastFailureConnectionError(new MongoNetworkError('ECONNREFUSED')),
    ).to.equal(true);
  });

  it('returns true for ENOTFOUND', function () {
    expect(
      isFastFailureConnectionError(new MongoNetworkError('ENOTFOUND')),
    ).to.equal(true);
  });

  it('returns true for ENETUNREACH', function () {
    expect(
      isFastFailureConnectionError(new MongoNetworkError('ENETUNREACH')),
    ).to.equal(true);
  });

  it('returns true when an API version is required', function () {
    expect(
      isFastFailureConnectionError(
        new MongoError('The apiVersion parameter is required'),
      ),
    ).to.equal(true);
  });

  it('returns false for generic errors', function () {
    expect(
      isFastFailureConnectionError(new Error('could not connect')),
    ).to.equal(false);
  });
});

describe('isPotentialTLSCertificateError', function () {
  // Like node-fetch's FetchError: the toStringTag is the constructor name,
  // which a minifier turns into something that does not contain 'error'
  class FetchErrorLike extends Error {
    code: string;
    constructor(msg: string, code: string) {
      super(msg);
      this.code = code;
    }

    get [Symbol.toStringTag]() {
      return 'd';
    }
  }

  it('returns true for an error with a TLS error code', function () {
    const error = Object.assign(new Error('certificate has expired'), {
      code: 'CERT_HAS_EXPIRED',
    });
    expect(isPotentialTLSCertificateError(error)).to.equal(true);
  });

  it('returns true when the TLS error is nested in `cause`, even if the error class name was minified', function () {
    const error = new Error('Unable to fetch issuer metadata', {
      cause: new Error('something went wrong', {
        cause: new FetchErrorLike('request failed', 'CERT_HAS_EXPIRED'),
      }),
    });
    expect(isPotentialTLSCertificateError(error)).to.equal(true);
  });

  it('returns true when the TLS error is part of an AggregateError', function () {
    const error = new AggregateError([
      new Error('unrelated'),
      new FetchErrorLike('request failed', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY'),
    ]);
    expect(isPotentialTLSCertificateError(error)).to.equal(true);
  });

  it('returns false for errors without a TLS error code', function () {
    const error = new Error('outer', {
      cause: new FetchErrorLike('request failed', 'ECONNRESET'),
    });
    expect(isPotentialTLSCertificateError(error)).to.equal(false);
  });

  it('returns true for an error from another realm', function () {
    // Only Error.isError (Node 24+) can recognize those, the fallback cannot
    if (!('isError' in Error)) return this.skip();
    const error = vm.runInNewContext(
      "Object.assign(new Error('x'), { code: 'CERT_HAS_EXPIRED' })",
    );
    expect(isPotentialTLSCertificateError(error)).to.equal(true);
  });

  it('returns false for objects that are not errors', function () {
    expect(
      isPotentialTLSCertificateError({ code: 'CERT_HAS_EXPIRED' }),
    ).to.equal(false);
    expect(
      isPotentialTLSCertificateError(
        Object.assign(Object.create(null), { code: 'CERT_HAS_EXPIRED' }),
      ),
    ).to.equal(false);
  });

  it('returns false for values that are not objects', function () {
    expect(isPotentialTLSCertificateError('CERT_HAS_EXPIRED')).to.equal(false);
    expect(isPotentialTLSCertificateError(undefined)).to.equal(false);
  });
});
