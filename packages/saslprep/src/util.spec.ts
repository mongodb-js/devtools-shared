import { setFlagsFromString } from 'v8';
import { range } from './util';
import { expect } from 'chai';

// 984 by default.
setFlagsFromString('--stack_size=500');

describe('range', function () {
  it('should work', function () {
    const list = range(1, 3);
    expect(list).to.deep.equal([1, 2, 3]);
  });

  it('should work for large ranges', function () {
    expect(() => range(1, 1e6)).not.to.throw();
  });
});
