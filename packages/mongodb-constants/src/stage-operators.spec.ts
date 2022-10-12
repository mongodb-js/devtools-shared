import { expect } from 'chai';
import { STAGE_OPERATORS } from './stage-operators';

describe('STAGE_OPERATORS', function () {
  it('should have comments without syntax errors', function () {
    STAGE_OPERATORS.forEach(({ comment }) => {
      expect(() => eval(comment)).to.not.throw();
    });
  });
});
