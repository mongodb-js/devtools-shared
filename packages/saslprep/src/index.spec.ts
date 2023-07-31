import saslprep from './index';
import { expect } from 'chai';

const chr = String.fromCodePoint;

describe('saslprep', function () {
  it('should work with latin letters', function () {
    const str = 'user';
    expect(saslprep(str)).to.equal(str);
  });

  it('should work be case preserved', function () {
    const str = 'USER';
    expect(saslprep(str)).to.equal(str);
  });

  it('should work with high code points (> U+FFFF)', function () {
    const str = '\uD83D\uDE00';
    expect(saslprep(str, { allowUnassigned: true })).to.equal(str);
  });

  it('should remove `mapped to nothing` characters', function () {
    expect(saslprep('I\u00ADX')).to.equal('IX');
  });

  it('should replace `Non-ASCII space characters` with space', function () {
    expect(saslprep('a\u00A0b')).to.equal('a\u0020b');
  });

  it('should normalize as NFKC', function () {
    expect(saslprep('\u00AA')).to.equal('a');
    expect(saslprep('\u2168')).to.equal('IX');
  });

  it('should throws when prohibited characters', function () {
    // C.2.1 ASCII control characters
    expect(() => saslprep('a\u007Fb')).to.throw();

    // C.2.2 Non-ASCII control characters
    expect(() => saslprep('a\u06DDb')).to.throw();

    // C.3 Private use
    expect(() => saslprep('a\uE000b')).to.throw();

    // C.4 Non-character code points
    expect(() => saslprep(`a${chr(0x1fffe)}b`)).to.throw();

    // C.5 Surrogate codes
    expect(() => saslprep('a\uD800b')).to.throw();

    // C.6 Inappropriate for plain text
    expect(() => saslprep('a\uFFF9b')).to.throw();

    // C.7 Inappropriate for canonical representation
    expect(() => saslprep('a\u2FF0b')).to.throw();

    // C.8 Change display properties or are deprecated
    expect(() => saslprep('a\u200Eb')).to.throw();

    // C.9 Tagging characters
    expect(() => saslprep(`a${chr(0xe0001)}b`)).to.throw();
  });

  it('should not containt RandALCat and LCat bidi', function () {
    expect(() => saslprep('a\u06DD\u00AAb')).to.throw();
  });

  it('RandALCat should be first and last', function () {
    expect(() => saslprep('\u0627\u0031\u0628')).not.to.throw();
    expect(() => saslprep('\u0627\u0031')).to.throw();
  });

  it('should handle unassigned code points', function () {
    expect(() => saslprep('a\u0487')).to.throw();
    expect(() => saslprep('a\u0487', { allowUnassigned: true })).not.to.throw();
  });
});
