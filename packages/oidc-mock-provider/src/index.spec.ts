import { expect } from 'chai';
import { OIDCMockProvider } from './';

// Not testing this since it's for testing anyway.
describe('OIDCMockProvider', function () {
  it('exists', function () {
    expect(OIDCMockProvider).to.be.a('function');
  });
});
