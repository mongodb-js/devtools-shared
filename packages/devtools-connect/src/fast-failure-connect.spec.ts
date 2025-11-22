import { expect } from 'chai';
import { isFastFailureConnectionError } from './fast-failure-connect';

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

  describe('isCompassSocketServiceError', function () {
    class CompassSocketServiceError extends Error {
      constructor(
        msg: string,
        public code: number,
      ) {
        super(msg);
        this.name = 'CompassSocketServiceError';
      }
    }

    it('returns true for UNAUTHORIZED (3000)', function () {
      const error = new CompassSocketServiceError('Unauthorized', 3000);
      expect(isFastFailureConnectionError(error)).to.equal(true);
    });

    it('returns true for FORBIDDEN (3003)', function () {
      const error = new CompassSocketServiceError('Forbidden', 3003);
      expect(isFastFailureConnectionError(error)).to.equal(true);
    });

    it('returns true for NOT_FOUND (4004)', function () {
      const error = new CompassSocketServiceError('Not found', 4004);
      expect(isFastFailureConnectionError(error)).to.equal(true);
    });

    it('returns true for VIOLATED_POLICY (1008)', function () {
      const error = new CompassSocketServiceError('Violated policy', 1008);
      expect(isFastFailureConnectionError(error)).to.equal(true);
    });

    it('returns true for DO_NOT_TRY_AGAIN (4101)', function () {
      const error = new CompassSocketServiceError('Do not try again', 4101);
      expect(isFastFailureConnectionError(error)).to.equal(true);
    });

    it('returns false for CompassSocketServiceError with non-fail-fast code', function () {
      const error = new CompassSocketServiceError('Some other error', 9999);
      expect(isFastFailureConnectionError(error)).to.equal(false);
    });

    it('returns true when CompassSocketServiceError is the cause of MongoNetworkError', function () {
      const cause = new CompassSocketServiceError('Unauthorized', 3000);
      const error = new MongoNetworkError('Connection failed');
      (error as any).cause = cause;
      expect(isFastFailureConnectionError(error)).to.equal(true);
    });

    it('returns true when CompassSocketServiceError is nested deeply', function () {
      const cause = new CompassSocketServiceError('Forbidden', 3003);
      const wrappedError = new Error('Wrapped error');
      (wrappedError as any).cause = cause;
      const error = new MongoNetworkError('Connection failed');
      (error as any).cause = wrappedError;
      expect(isFastFailureConnectionError(error)).to.equal(true);
    });

    it('returns true when CompassSocketServiceError is in an AggregateError', function () {
      const cause = new CompassSocketServiceError('Not found', 4004);
      const aggregateError = new AggregateError(
        [new Error('Other error'), cause],
        'Multiple errors',
      );
      expect(isFastFailureConnectionError(aggregateError)).to.equal(true);
    });
  });
});
